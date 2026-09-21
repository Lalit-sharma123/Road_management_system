import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { 
  Activity, 
  AlertTriangle, 
  Flame, 
  Info, 
  Maximize2, 
  Minimize2, 
  Sliders, 
  Sparkles, 
  TrendingUp, 
  Zap,
  Clock,
  Crosshair,
  ShieldAlert
} from 'lucide-react';
import { InspectionVideo, Detection, SeverityLevel } from '../types/inspection';

export interface TimelineDataPoint {
  timeSec: number;
  frameNumber: number;
  severityScore: number; // 0 - 100
  severityLevel: SeverityLevel;
  category?: string;
  confidence?: number;
  detectionId?: string;
  isDefectEvent: boolean;
  actionNote?: string;
}

interface InspectionDamageSeverityChartProps {
  video: InspectionVideo;
  onSelectTimestamp?: (timeSec: number) => void;
  className?: string;
}

export const InspectionDamageSeverityChart: React.FC<InspectionDamageSeverityChartProps> = ({
  video,
  onSelectTimestamp,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Responsive dimensions
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height: 320
  });

  // UI state controls
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showThresholdBands, setShowThresholdBands] = useState<boolean>(true);
  const [showAreaFill, setShowAreaFill] = useState<boolean>(true);
  const [isSmoothed, setIsSmoothed] = useState<boolean>(true);
  const [activeTooltip, setActiveTooltip] = useState<{
    point: TimelineDataPoint;
    x: number;
    y: number;
  } | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<TimelineDataPoint | null>(null);

  // Extract / synthesize timeline data from video.frames & detections
  const timelineData = useMemo(() => {
    const duration = Math.max(video.duration_seconds || 48, 10);
    const totalFrames = video.total_frames || Math.round(duration * (video.fps || 30));
    const fps = video.fps || 30;

    // Gather real detections from frames
    const rawDetections: Array<Detection & { frame_number: number; timestamp_sec: number }> = [];
    
    if (video.frames && video.frames.length > 0) {
      video.frames.forEach(frame => {
        if (frame.detections && frame.detections.length > 0) {
          frame.detections.forEach(det => {
            rawDetections.push({
              ...det,
              frame_number: det.frame_number ?? frame.frame_number,
              timestamp_sec: det.timestamp_sec ?? frame.timestamp_sec
            });
          });
        }
      });
    }

    // Extract real detections only from frames
    const eventPoints: TimelineDataPoint[] = [];

    if (rawDetections.length > 0) {
      rawDetections.forEach(d => {
        let score = d.severity_score;
        if (!score) {
          if (d.severity === 'critical') score = 90;
          else if (d.severity === 'high') score = 75;
          else if (d.severity === 'medium') score = 50;
          else score = 25;
        }
        eventPoints.push({
          timeSec: Math.min(d.timestamp_sec, duration),
          frameNumber: d.frame_number,
          severityScore: score,
          severityLevel: d.severity,
          category: d.category,
          confidence: d.confidence,
          detectionId: d.id,
          isDefectEvent: true,
          actionNote: d.severity === 'critical' ? 'Urgent dispatch required' : 'Scheduled maintenance'
        });
      });
    }

    // Sort defect points by time
    eventPoints.sort((a, b) => a.timeSec - b.timeSec);

    // Build continuous timeline curve across inspection duration
    const denseStep = duration > 120 ? 2 : duration > 60 ? 1 : 0.5;
    const continuousPoints: TimelineDataPoint[] = [];
    const totalSteps = Math.ceil(duration / denseStep);

    // If no defects detected, road is clear (score 0)
    for (let i = 0; i <= totalSteps; i++) {
      const t = Math.min(i * denseStep, duration);
      const frameNum = Math.round(t * fps);

      let combinedScore = 0;
      let dominantCategory: string | undefined = undefined;
      let dominantConfidence: number | undefined = undefined;
      let dominantLevel: SeverityLevel = 'low';

      // Find nearby defects within 2.5s window
      for (const ev of eventPoints) {
        const diff = Math.abs(t - ev.timeSec);
        if (diff < 2.5) {
          // Gaussian peak around detected real defects
          const weight = Math.exp(-Math.pow(diff / 1.1, 2));
          const added = ev.severityScore * weight;
          if (added > combinedScore) {
            combinedScore = Math.min(100, added);
            dominantCategory = ev.category;
            dominantConfidence = ev.confidence;
            dominantLevel = ev.severityLevel;
          }
        }
      }

      // Check if this point matches an actual defect event
      const exactMatch = eventPoints.find(e => Math.abs(e.timeSec - t) < denseStep * 0.49);

      if (exactMatch) {
        continuousPoints.push(exactMatch);
      } else {
        const level: SeverityLevel = 
          combinedScore >= 75 ? 'critical' :
          combinedScore >= 50 ? 'high' :
          combinedScore >= 25 ? 'medium' : 'low';

        continuousPoints.push({
          timeSec: t,
          frameNumber: frameNum,
          severityScore: Math.max(5, Math.min(100, Math.round(combinedScore * 10) / 10)),
          severityLevel: dominantLevel !== 'low' ? dominantLevel : level,
          category: dominantCategory,
          confidence: dominantConfidence,
          isDefectEvent: false
        });
      }
    }

    // Ensure all defect points are explicitly present in the data array for rendering points
    eventPoints.forEach(ev => {
      if (!continuousPoints.some(p => p.detectionId === ev.detectionId)) {
        continuousPoints.push(ev);
      }
    });

    continuousPoints.sort((a, b) => a.timeSec - b.timeSec);

    return {
      continuousPoints,
      defectEvents: eventPoints,
      duration,
      totalFrames
    };
  }, [video]);

  // Derived statistics for the executive telemetry banner
  const stats = useMemo(() => {
    const defects = timelineData.defectEvents;
    const scores = timelineData.continuousPoints.map(p => p.severityScore);
    
    const maxScore = Math.max(...scores, 0);
    const peakPoint = maxScore > 0 ? timelineData.continuousPoints.find(p => p.severityScore === maxScore) : undefined;
    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '0.0';
    
    const criticalEvents = defects.filter(d => d.severityLevel === 'critical' || d.severityScore >= 75);
    const highEvents = defects.filter(d => d.severityLevel === 'high' || (d.severityScore >= 50 && d.severityScore < 75));
    
    // Time percentage above 50 severity
    const severeSamples = scores.filter(s => s >= 50).length;
    const highDistressPct = scores.length > 0 ? Math.round((severeSamples / scores.length) * 100) : 0;

    return {
      maxScore,
      peakTime: peakPoint ? peakPoint.timeSec : 0,
      peakFrame: peakPoint ? peakPoint.frameNumber : 0,
      peakCategory: peakPoint?.category || (defects.length > 0 ? 'pothole' : 'None'),
      avgScore,
      criticalCount: criticalEvents.length,
      highCount: highEvents.length,
      totalDefects: defects.length,
      highDistressPct
    };
  }, [timelineData]);

  // Handle Container Resizing via ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const entry = entries[0];
      const newWidth = Math.max(entry.contentRect.width, 320);
      const newHeight = Math.max(Math.min(newWidth * 0.38, 360), 260);

      setDimensions({
        width: newWidth,
        height: newHeight
      });
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Format mm:ss.s timestamp helper
  const formatTime = useCallback((secs: number) => {
    const m = Math.floor(secs / 60);
    const s = (secs % 60).toFixed(1);
    const sPad = parseFloat(s) < 10 ? `0${s}` : s;
    return `${m.toString().padStart(2, '0')}:${sPad}`;
  }, []);

  // Main D3 Drawing Effect
  useEffect(() => {
    if (!svgRef.current || dimensions.width <= 0 || dimensions.height <= 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 28, right: 34, bottom: 44, left: 48 };
    const innerWidth = Math.max(dimensions.width - margin.left - margin.right, 50);
    const innerHeight = Math.max(dimensions.height - margin.top - margin.bottom, 50);

    // Filter continuous points according to category filter
    const pointsToRender = timelineData.continuousPoints.filter(p => {
      if (selectedCategory === 'all') return true;
      if (!p.category) return true; // keep base curve
      return p.category === selectedCategory;
    });

    // Defect nodes to render
    const defectsToRender = timelineData.defectEvents.filter(p => {
      if (selectedCategory === 'all') return true;
      return p.category === selectedCategory;
    });

    // Scales
    const xScale = d3.scaleLinear()
      .domain([0, timelineData.duration])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([innerHeight, 0]);

    // Defs & Gradients
    const defs = svg.append('defs');

    // Glow Filter for curve & defect points
    const glowFilter = defs.append('filter')
      .attr('id', 'severity-line-glow')
      .attr('x', '-30%')
      .attr('y', '-30%')
      .attr('width', '160%')
      .attr('height', '160%');

    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '3.5')
      .attr('result', 'coloredBlur');

    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Vertical Area Gradient (Critical Red -> Amber -> Indigo -> Slate transparent)
    const areaGradient = defs.append('linearGradient')
      .attr('id', 'severity-area-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    areaGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#F43F5E')
      .attr('stop-opacity', '0.45');

    areaGradient.append('stop')
      .attr('offset', '35%')
      .attr('stop-color', '#F59E0B')
      .attr('stop-opacity', '0.28');

    areaGradient.append('stop')
      .attr('offset', '65%')
      .attr('stop-color', '#6366F1')
      .attr('stop-opacity', '0.15');

    areaGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#0F172A')
      .attr('stop-opacity', '0.02');

    // Line Stroke Gradient along X-Axis
    const strokeGradient = defs.append('linearGradient')
      .attr('id', 'severity-stroke-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');

    strokeGradient.append('stop').attr('offset', '0%').attr('stop-color', '#818CF8');
    strokeGradient.append('stop').attr('offset', '40%').attr('stop-color', '#F59E0B');
    strokeGradient.append('stop').attr('offset', '70%').attr('stop-color', '#F43F5E');
    strokeGradient.append('stop').attr('offset', '100%').attr('stop-color', '#A855F7');

    // Main Chart Group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // 1. Severity Threshold Zones (Critical > 75, High 50-75, Moderate 25-50, Good 0-25)
    if (showThresholdBands) {
      const zones = [
        { y1: 75, y2: 100, color: 'rgba(244, 63, 94, 0.08)', border: 'rgba(244, 63, 94, 0.28)', label: 'CRITICAL ZONE (>75)', textColor: '#FDA4AF' },
        { y1: 50, y2: 75, color: 'rgba(245, 158, 11, 0.06)', border: 'rgba(245, 158, 11, 0.22)', label: 'HIGH SEVERITY (50-75)', textColor: '#FCD34D' },
        { y1: 25, y2: 50, color: 'rgba(99, 102, 241, 0.04)', border: 'rgba(99, 102, 241, 0.16)', label: 'MODERATE (25-50)', textColor: '#A5B4FC' },
        { y1: 0, y2: 25, color: 'rgba(16, 185, 129, 0.03)', border: 'rgba(16, 185, 129, 0.12)', label: 'NOMINAL / FAIR (<25)', textColor: '#6EE7B7' }
      ];

      zones.forEach(zone => {
        const yTop = yScale(zone.y2);
        const yBottom = yScale(zone.y1);
        const bandHeight = yBottom - yTop;

        // Band Background
        g.append('rect')
          .attr('x', 0)
          .attr('y', yTop)
          .attr('width', innerWidth)
          .attr('height', bandHeight)
          .attr('fill', zone.color);

        // Dashed Threshold Line at zone boundary
        if (zone.y1 > 0) {
          g.append('line')
            .attr('x1', 0)
            .attr('x2', innerWidth)
            .attr('y1', yBottom)
            .attr('y2', yBottom)
            .attr('stroke', zone.border)
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '4 4');
        }

        // Zone watermark label
        g.append('text')
          .attr('x', innerWidth - 8)
          .attr('y', yTop + 14)
          .attr('text-anchor', 'end')
          .attr('fill', zone.textColor)
          .attr('font-size', '9px')
          .attr('font-weight', '600')
          .attr('font-family', 'JetBrains Mono, monospace')
          .attr('opacity', 0.8)
          .text(zone.label);
      });
    }

    // 2. Grid Lines
    // Horizontal Grid Lines (Y-Axis ticks)
    const yTicks = [0, 25, 50, 75, 100];
    yTicks.forEach(tickVal => {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yScale(tickVal))
        .attr('y2', yScale(tickVal))
        .attr('stroke', 'rgba(255, 255, 255, 0.07)')
        .attr('stroke-width', 1);
    });

    // Vertical Grid Lines (Time ticks)
    const xTicks = xScale.ticks(Math.max(Math.floor(innerWidth / 90), 4));
    xTicks.forEach(tickSec => {
      g.append('line')
        .attr('x1', xScale(tickSec))
        .attr('x2', xScale(tickSec))
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', 'rgba(255, 255, 255, 0.05)')
        .attr('stroke-width', 1);
    });

    // 3. Line & Area Generators
    const curveType = isSmoothed ? d3.curveMonotoneX : d3.curveLinear;

    const areaGenerator = d3.area<TimelineDataPoint>()
      .x(d => xScale(d.timeSec))
      .y0(innerHeight)
      .y1(d => yScale(d.severityScore))
      .curve(curveType);

    const lineGenerator = d3.line<TimelineDataPoint>()
      .x(d => xScale(d.timeSec))
      .y(d => yScale(d.severityScore))
      .curve(curveType);

    // 4. Area Path under the curve
    if (showAreaFill) {
      g.append('path')
        .datum(pointsToRender)
        .attr('fill', 'url(#severity-area-gradient)')
        .attr('d', areaGenerator)
        .attr('opacity', 0.95);
    }

    // 5. Main Severity Line Path
    const path = g.append('path')
      .datum(pointsToRender)
      .attr('fill', 'none')
      .attr('stroke', 'url(#severity-stroke-gradient)')
      .attr('stroke-width', 2.5)
      .attr('filter', 'url(#severity-line-glow)')
      .attr('d', lineGenerator);

    // Smooth entry transition
    const totalLength = path.node()?.getTotalLength() || 0;
    if (totalLength > 0) {
      path
        .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(800)
        .ease(d3.easeCubicOut)
        .attr('stroke-dashoffset', 0);
    }

    // 6. Defect Event Nodes along the timeline
    const nodeGroup = g.append('g').attr('class', 'defect-nodes');

    defectsToRender.forEach((d) => {
      const cx = xScale(d.timeSec);
      const cy = yScale(d.severityScore);

      const isCritical = d.severityLevel === 'critical' || d.severityScore >= 75;
      const isHigh = d.severityLevel === 'high' || (d.severityScore >= 50 && d.severityScore < 75);
      const isMedium = d.severityLevel === 'medium' || (d.severityScore >= 25 && d.severityScore < 50);

      const color = isCritical ? '#F43F5E' : isHigh ? '#F59E0B' : isMedium ? '#EAB308' : '#34D399';
      const radius = isCritical ? 6.5 : isHigh ? 5.5 : 4.5;

      // Vertical guideline from baseline to node
      nodeGroup.append('line')
        .attr('x1', cx)
        .attr('x2', cx)
        .attr('y1', cy)
        .attr('y2', innerHeight)
        .attr('stroke', color)
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2 2')
        .attr('opacity', 0.4);

      // Outer pulse ring for critical events
      if (isCritical) {
        nodeGroup.append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', radius + 4)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 1.5)
          .attr('opacity', 0.5)
          .attr('class', 'animate-pulse');
      }

      // Main Point Circle
      const circle = nodeGroup.append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', radius)
        .attr('fill', color)
        .attr('stroke', '#0F172A')
        .attr('stroke-width', 2)
        .attr('cursor', 'pointer')
        .attr('filter', 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))');

      // Click handler
      circle.on('click', () => {
        setSelectedPoint(d);
        if (onSelectTimestamp) {
          onSelectTimestamp(d.timeSec);
        }
      });
    });

    // 7. Interactive Crosshair & Hover Overlay
    const crosshairGroup = g.append('g').attr('class', 'crosshair-group').style('display', 'none');

    const crosshairLineX = crosshairGroup.append('line')
      .attr('stroke', 'rgba(255, 255, 255, 0.45)')
      .attr('stroke-width', 1.2)
      .attr('stroke-dasharray', '3 3')
      .attr('y1', 0)
      .attr('y2', innerHeight);

    const crosshairLineY = crosshairGroup.append('line')
      .attr('stroke', 'rgba(255, 255, 255, 0.35)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3 3')
      .attr('x1', 0)
      .attr('x2', innerWidth);

    const hoverDot = crosshairGroup.append('circle')
      .attr('r', 6)
      .attr('fill', '#FFFFFF')
      .attr('stroke', '#6366F1')
      .attr('stroke-width', 2.5)
      .attr('filter', 'url(#severity-line-glow)');

    // Bisector for tracking closest point
    const bisectTime = d3.bisector<TimelineDataPoint, number>(d => d.timeSec).center;

    // Invisible mouse tracking capture rect
    g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .attr('cursor', 'crosshair')
      .on('mouseenter', () => {
        crosshairGroup.style('display', null);
      })
      .on('mousemove', function(event) {
        const [mx, my] = d3.pointer(event, this);
        const hoveredSec = xScale.invert(mx);

        const index = bisectTime(pointsToRender, hoveredSec);
        const point = pointsToRender[index] || pointsToRender[0];

        if (point) {
          const px = xScale(point.timeSec);
          const py = yScale(point.severityScore);

          crosshairLineX.attr('x1', px).attr('x2', px);
          crosshairLineY.attr('y1', py).attr('y2', py);
          hoverDot.attr('cx', px).attr('cy', py);

          // Update state tooltip
          const containerRect = containerRef.current?.getBoundingClientRect();
          if (containerRect) {
            setActiveTooltip({
              point,
              x: px + margin.left,
              y: py + margin.top
            });
          }
        }
      })
      .on('mouseleave', () => {
        crosshairGroup.style('display', 'none');
        setActiveTooltip(null);
      })
      .on('click', function(event) {
        const [mx] = d3.pointer(event, this);
        const clickedSec = xScale.invert(mx);
        const index = bisectTime(pointsToRender, clickedSec);
        const point = pointsToRender[index];
        if (point) {
          setSelectedPoint(point);
          if (onSelectTimestamp) {
            onSelectTimestamp(point.timeSec);
          }
        }
      });

    // 8. Custom Axes Rendering
    // Y-Axis Labels
    const yAxisGroup = g.append('g').attr('class', 'y-axis');
    yTicks.forEach(tick => {
      const yPos = yScale(tick);
      yAxisGroup.append('text')
        .attr('x', -10)
        .attr('y', yPos + 3.5)
        .attr('text-anchor', 'end')
        .attr('fill', '#94A3B8')
        .attr('font-size', '10px')
        .attr('font-family', 'JetBrains Mono, monospace')
        .text(tick);
    });

    // Y-Axis Title
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -(margin.top + innerHeight / 2))
      .attr('y', 14)
      .attr('text-anchor', 'middle')
      .attr('fill', '#CBD5E1')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('letter-spacing', '0.05em')
      .text('SEVERITY SCORE (0 - 100)');

    // X-Axis Labels
    const xAxisGroup = g.append('g').attr('class', 'x-axis');
    xTicks.forEach(tick => {
      const xPos = xScale(tick);
      xAxisGroup.append('text')
        .attr('x', xPos)
        .attr('y', innerHeight + 18)
        .attr('text-anchor', 'middle')
        .attr('fill', '#94A3B8')
        .attr('font-size', '10px')
        .attr('font-family', 'JetBrains Mono, monospace')
        .text(formatTime(tick));
    });

    // X-Axis Title
    svg.append('text')
      .attr('x', margin.left + innerWidth / 2)
      .attr('y', dimensions.height - 8)
      .attr('text-anchor', 'middle')
      .attr('fill', '#CBD5E1')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('letter-spacing', '0.05em')
      .text('INSPECTION TIMELINE DURATION (MM:SS)');

  }, [dimensions, timelineData, selectedCategory, showThresholdBands, showAreaFill, isSmoothed, formatTime, onSelectTimestamp]);

  return (
    <div className={`space-y-4 font-mono ${className}`}>
      {/* Chart Control Bar & Category Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#15181F]/90 border border-slate-800 p-3.5 rounded-xl shadow-md">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 via-indigo-600 to-rose-500 flex items-center justify-center text-white shadow-xs">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>Damage Severity Timeline</span>
              <span className="text-[9px] px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                D3.js
              </span>
            </h4>
            <p className="text-[10px] text-slate-400">
              Temporal distribution of highway pavement distress across {timelineData.duration.toFixed(1)}s video inspection
            </p>
          </div>
        </div>

        {/* View Controls & Toggles */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Category Filter */}
          <div className="flex items-center space-x-1 bg-slate-900/80 border border-slate-800 rounded-lg p-1 text-[11px]">
            <span className="text-slate-400 px-1 text-[10px] uppercase font-bold">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-slate-200 text-[11px] font-medium focus:outline-none cursor-pointer pr-1"
            >
              <option value="all" className="bg-slate-900 text-white">All Defect Types ({timelineData.defectEvents.length})</option>
              <option value="pothole" className="bg-slate-900 text-white">Potholes Only</option>
              <option value="alligator_crack" className="bg-slate-900 text-white">Alligator Cracks</option>
              <option value="longitudinal_crack" className="bg-slate-900 text-white">Longitudinal Cracks</option>
              <option value="broken_road" className="bg-slate-900 text-white">Broken Road</option>
              <option value="missing_asphalt" className="bg-slate-900 text-white">Missing Asphalt</option>
            </select>
          </div>

          {/* Threshold Bands Toggle */}
          <button
            onClick={() => setShowThresholdBands(prev => !prev)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors ${
              showThresholdBands 
                ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300' 
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Toggle ASTM Severity Zone Bands"
          >
            Zones
          </button>

          {/* Area Fill Toggle */}
          <button
            onClick={() => setShowAreaFill(prev => !prev)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors ${
              showAreaFill 
                ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300' 
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Toggle Gradient Under-Area Fill"
          >
            Gradient Fill
          </button>

          {/* Smoothing Curve Toggle */}
          <button
            onClick={() => setIsSmoothed(prev => !prev)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors ${
              isSmoothed 
                ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300' 
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Toggle Spline Smoothing vs Linear Points"
          >
            {isSmoothed ? 'Spline' : 'Linear'}
          </button>
        </div>
      </div>

      {/* KPI Telemetry Header Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-[#141720] border border-slate-800/90 p-3 rounded-xl">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span className="uppercase">Peak Severity</span>
            <Flame className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-extrabold text-rose-400 mt-1 flex items-baseline gap-1">
            <span>{stats.maxScore.toFixed(0)}</span>
            <span className="text-xs text-slate-400 font-normal">/ 100</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            At {formatTime(stats.peakTime)} (Frame {stats.peakFrame})
          </div>
        </div>

        <div className="bg-[#141720] border border-slate-800/90 p-3 rounded-xl">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span className="uppercase">Corridor Avg Severity</span>
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-xl font-extrabold text-indigo-300 mt-1 flex items-baseline gap-1">
            <span>{stats.avgScore}</span>
            <span className="text-xs text-slate-400 font-normal">/ 100</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Mean Pavement Distress Index
          </div>
        </div>

        <div className="bg-[#141720] border border-slate-800/90 p-3 rounded-xl">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span className="uppercase">Critical Hotspots</span>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-extrabold text-amber-400 mt-1">
            {stats.criticalCount} Zones
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Requiring &lt;48h repair response
          </div>
        </div>

        <div className="bg-[#141720] border border-slate-800/90 p-3 rounded-xl">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span className="uppercase">High Distress Exposure</span>
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-emerald-400 mt-1">
            {stats.highDistressPct}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Duration with score &gt;50
          </div>
        </div>
      </div>

      {/* Main D3 Canvas Container with Relative Tooltip */}
      <div 
        ref={containerRef} 
        className="relative bg-[#0D1017] border border-slate-800 rounded-2xl p-2 sm:p-3 overflow-hidden shadow-xl select-none"
      >
        {/* Background Subtle Grid Texture */}
        <div className="absolute inset-0 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

        {/* SVG Viewport */}
        <svg 
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-auto block overflow-visible"
        />

        {/* Floating Crosshair Tooltip */}
        {activeTooltip && (
          <div 
            className="pointer-events-none absolute z-40 bg-[#0F1420]/95 backdrop-blur-md border border-slate-700/80 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 transition-all duration-75 max-w-xs"
            style={{
              left: `${Math.min(activeTooltip.x + 15, dimensions.width - 240)}px`,
              top: `${Math.max(activeTooltip.y - 70, 15)}px`
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-1 gap-2">
              <span className="text-slate-400 font-mono text-[10px]">
                TIME: <strong className="text-white">{formatTime(activeTooltip.point.timeSec)}</strong>
              </span>
              <span className="text-[9px] px-1.5 py-0.2 bg-slate-800 text-slate-300 font-mono rounded">
                Frame {activeTooltip.point.frameNumber}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-300 font-medium">Severity Score:</span>
              <span className={`font-mono font-bold text-sm ${
                activeTooltip.point.severityScore >= 75 ? 'text-rose-400' :
                activeTooltip.point.severityScore >= 50 ? 'text-amber-400' :
                activeTooltip.point.severityScore >= 25 ? 'text-indigo-300' : 'text-emerald-400'
              }`}>
                {activeTooltip.point.severityScore.toFixed(1)} / 100
              </span>
            </div>

            {activeTooltip.point.category && (
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-slate-400">Distress Category:</span>
                <span className="text-white font-bold uppercase">
                  {activeTooltip.point.category.replace('_', ' ')}
                </span>
              </div>
            )}

            {activeTooltip.point.confidence && (
              <div className="flex items-center justify-between gap-2 text-[10px]">
                <span className="text-slate-400">YOLO Confidence:</span>
                <span className="text-indigo-300 font-mono">
                  {(activeTooltip.point.confidence * 100).toFixed(0)}%
                </span>
              </div>
            )}

            {activeTooltip.point.actionNote && (
              <div className="pt-1 border-t border-slate-800 text-[10px] text-amber-300/90 leading-tight">
                Recommended: {activeTooltip.point.actionNote}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Defect Snapshot or Inspector Detail Callout */}
      {selectedPoint && (
        <div className="bg-[#141722] border border-indigo-500/30 rounded-xl p-3.5 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              selectedPoint.severityScore >= 75 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
              selectedPoint.severityScore >= 50 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
              'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
            }`}>
              <Crosshair className="w-4 h-4" />
            </div>
            <div>
              <div className="text-white font-bold flex items-center gap-2">
                <span>Selected Inspection Marker: {formatTime(selectedPoint.timeSec)}</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-white/10 text-slate-200 rounded font-mono">
                  Frame #{selectedPoint.frameNumber}
                </span>
              </div>
              <div className="text-[11px] text-slate-300 mt-0.5">
                Category: <b className="uppercase text-indigo-300">{selectedPoint.category?.replace('_', ' ') || 'Pavement Roughness'}</b>
                {' • '} Severity: <b className="text-white">{selectedPoint.severityScore} / 100</b>
                {selectedPoint.confidence && ` • Conf: ${(selectedPoint.confidence * 100).toFixed(0)}%`}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {onSelectTimestamp && (
              <button
                onClick={() => onSelectTimestamp(selectedPoint.timeSec)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-xs transition-colors flex items-center space-x-1 shadow-xs"
              >
                <span>Jump to Frame</span>
              </button>
            )}
            <button
              onClick={() => setSelectedPoint(null)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Legend & ASTM Distress Standard Description */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-slate-300">Severity Legend:</span>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]" />
            <span>Critical (&gt;75)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]" />
            <span>High (50 - 75)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.6)]" />
            <span>Moderate (25 - 50)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
            <span>Good (&lt;25)</span>
          </div>
        </div>

        <div className="text-slate-500">
          ASTM D6433 Pavement Condition Index (PCI) Temporal Curve
        </div>
      </div>
    </div>
  );
};
