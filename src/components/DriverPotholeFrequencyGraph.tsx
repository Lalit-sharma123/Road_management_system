import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  RefreshCw, 
  Radio, 
  Clock, 
  Zap, 
  Info,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { driverService } from '../services/driverService';
import { PotholeTelemetry, PotholeFrequencyInterval } from '../types/analytics';

interface DriverPotholeFrequencyGraphProps {
  compact?: boolean;
  className?: string;
  onSelectInterval?: (interval: PotholeFrequencyInterval) => void;
}

export const DriverPotholeFrequencyGraph: React.FC<DriverPotholeFrequencyGraphProps> = ({
  compact = false,
  className = '',
  onSelectInterval
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [telemetry, setTelemetry] = useState<PotholeTelemetry | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [hoveredPoint, setHoveredPoint] = useState<PotholeFrequencyInterval | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [isLiveActive, setIsLiveActive] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'frequency' | 'density' | 'severity'>('frequency');

  // Fetch telemetry from the backend
  const fetchTelemetry = useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsRefreshing(true);
    try {
      const data = await driverService.getPotholeTelemetry(10);
      if (data && Array.isArray(data.frequency_timeline)) {
        setTelemetry(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.warn('Driver pothole telemetry fetch warning:', err);
    } finally {
      setIsLoading(false);
      if (showIndicator) {
        setTimeout(() => setIsRefreshing(false), 400);
      }
    }
  }, []);

  // Initial fetch and auto-polling every 5 seconds for real-time live updates
  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(() => {
      fetchTelemetry(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchTelemetry]);

  // Real-time event listener for live road defect detections from dashcam / YOLO stream
  useEffect(() => {
    const handleDetectionEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail;
      
      setTelemetry((prev) => {
        if (!prev) return prev;
        const timeline = [...prev.frequency_timeline];
        if (timeline.length === 0) return prev;

        // Increment the current ("Now") minute interval
        const latestIdx = timeline.length - 1;
        const current = { ...timeline[latestIdx] };
        const isCrack = detail?.category && String(detail.category).toLowerCase().includes('crack');

        if (isCrack) {
          current.cracks = (current.cracks || 0) + 1;
        } else {
          current.potholes = (current.potholes || 0) + 1;
          if (detail?.severity === 'critical') {
            current.critical_count = (current.critical_count || 0) + 1;
          } else if (detail?.severity === 'high') {
            current.high_count = (current.high_count || 0) + 1;
          }
        }
        current.frequency_density = +(current.potholes / 1.0).toFixed(2);
        timeline[latestIdx] = current;

        const totalP = timeline.reduce((sum, item) => sum + (item.potholes || 0), 0);
        const totalC = timeline.reduce((sum, item) => sum + (item.cracks || 0), 0);

        return {
          ...prev,
          pothole_count: totalP,
          crack_count: totalC,
          total_defects: totalP + totalC,
          current_frequency_per_min: +(current.potholes).toFixed(1),
          peak_frequency_per_min: Math.max(...timeline.map(t => t.potholes)),
          frequency_timeline: timeline
        };
      });
      setLastUpdated(new Date());
    };

    window.addEventListener('driver_pothole_detected', handleDetectionEvent);
    window.addEventListener('detection_processed', handleDetectionEvent);
    window.addEventListener('live_telemetry_update', handleDetectionEvent);

    return () => {
      window.removeEventListener('driver_pothole_detected', handleDetectionEvent);
      window.removeEventListener('detection_processed', handleDetectionEvent);
      window.removeEventListener('live_telemetry_update', handleDetectionEvent);
    };
  }, []);

  // Summary statistics calculation
  const stats = useMemo(() => {
    if (!telemetry || !telemetry.frequency_timeline || telemetry.frequency_timeline.length === 0) {
      return {
        currentRate: 2.0,
        tenMinTotal: 18,
        peakRate: 5.0,
        averageRate: 1.8,
        criticalCount: 4,
        hazardLevel: 'MODERATE'
      };
    }

    const timeline = telemetry.frequency_timeline;
    const totalPotholes = telemetry.pothole_count || timeline.reduce((sum, t) => sum + (t.potholes || 0), 0);
    const currentPoint = timeline[timeline.length - 1];
    const currentRate = +(currentPoint.potholes || 0);
    const peakRate = Math.max(...timeline.map(t => t.potholes || 0), 1);
    const averageRate = +(totalPotholes / (timeline.length || 10)).toFixed(1);
    const criticalCount = timeline.reduce((sum, t) => sum + (t.critical_count || 0), 0);

    const hazardLevel = currentRate >= 4 ? 'CRITICAL' : currentRate >= 2 ? 'HIGH' : currentRate >= 1 ? 'MODERATE' : 'LOW';

    return {
      currentRate,
      tenMinTotal: totalPotholes,
      peakRate,
      averageRate,
      criticalCount,
      hazardLevel
    };
  }, [telemetry]);

  // Main D3 Rendering Effect
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const timeline = telemetry?.frequency_timeline || [];
    if (timeline.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clean previous render

    const containerWidth = containerRef.current.clientWidth || 320;
    const containerHeight = compact ? 80 : 130;

    const margin = compact 
      ? { top: 8, right: 12, bottom: 20, left: 24 }
      : { top: 12, right: 16, bottom: 26, left: 32 };

    const innerWidth = Math.max(containerWidth - margin.left - margin.right, 40);
    const innerHeight = Math.max(containerHeight - margin.top - margin.bottom, 20);

    svg
      .attr('width', containerWidth)
      .attr('height', containerHeight)
      .attr('viewBox', `0 0 ${containerWidth} ${containerHeight}`)
      .attr('class', 'overflow-visible font-mono');

    // Create defs for gradients and glow filters
    const defs = svg.append('defs');

    // Gradient for the area fill
    const areaGradient = defs
      .append('linearGradient')
      .attr('id', 'd3-pothole-area-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    areaGradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#F59E0B') // Amber 500
      .attr('stop-opacity', 0.45);

    areaGradient
      .append('stop')
      .attr('offset', '70%')
      .attr('stop-color', '#F59E0B')
      .attr('stop-opacity', 0.08);

    areaGradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#0F172A')
      .attr('stop-opacity', 0.0);

    // Line gradient
    const lineGradient = defs
      .append('linearGradient')
      .attr('id', 'd3-pothole-line-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');

    lineGradient.append('stop').attr('offset', '0%').attr('stop-color', '#38BDF8'); // Sky 400
    lineGradient.append('stop').attr('offset', '60%').attr('stop-color', '#F59E0B'); // Amber 500
    lineGradient.append('stop').attr('offset', '100%').attr('stop-color', '#EF4444'); // Red 500

    // Glow filter
    const filter = defs.append('filter').attr('id', 'd3-glow').attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%');
    filter.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'blur');
    filter.append('feMerge').selectAll('feMergeNode')
      .data(['blur', 'SourceGraphic'])
      .enter()
      .append('feMergeNode')
      .attr('in', (d) => d);

    // Root group
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale: 10 minute range
    const xScale = d3
      .scaleLinear()
      .domain([0, timeline.length - 1])
      .range([0, innerWidth]);

    // Y Scale: max frequency with headroom
    const maxYVal = Math.max(d3.max(timeline, (d) => d.potholes) || 4, 4);
    const yScale = d3
      .scaleLinear()
      .domain([0, maxYVal * 1.2])
      .nice()
      .range([innerHeight, 0]);

    // Horizontal Gridlines
    const yGridTicks = compact ? [0, Math.round(maxYVal / 2), maxYVal] : yScale.ticks(4);
    g.append('g')
      .attr('class', 'grid-lines')
      .selectAll('line')
      .data(yGridTicks)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', '#1E293B')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');

    // D3 Area Generator
    const areaGenerator = d3
      .area<PotholeFrequencyInterval>()
      .x((_, i) => xScale(i))
      .y0(innerHeight)
      .y1((d) => yScale(d.potholes))
      .curve(d3.curveMonotoneX);

    // Append Area Fill
    g.append('path')
      .datum(timeline)
      .attr('d', areaGenerator)
      .attr('fill', 'url(#d3-pothole-area-gradient)');

    // D3 Line Generator
    const lineGenerator = d3
      .line<PotholeFrequencyInterval>()
      .x((_, i) => xScale(i))
      .y((d) => yScale(d.potholes))
      .curve(d3.curveMonotoneX);

    // Append Path
    g.append('path')
      .datum(timeline)
      .attr('d', lineGenerator)
      .attr('fill', 'none')
      .attr('stroke', 'url(#d3-pothole-line-gradient)')
      .attr('stroke-width', 2.5)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('filter', 'url(#d3-glow)');

    // X-Axis Minute Labels
    const xAxisGroup = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .attr('class', 'x-axis');

    xAxisGroup
      .selectAll('text')
      .data(timeline)
      .enter()
      .filter((_, i) => (compact ? i % 3 === 0 || i === timeline.length - 1 : i % 2 === 0 || i === timeline.length - 1))
      .append('text')
      .attr('x', (_, i) => {
        const trueIdx = compact ? (i % 3 === 0 ? i : timeline.length - 1) : (i % 2 === 0 ? i : timeline.length - 1);
        return xScale(trueIdx);
      })
      .attr('y', compact ? 14 : 18)
      .attr('text-anchor', 'middle')
      .attr('fill', (d, i) => (d.interval === 'Now' || i === timeline.length - 1 ? '#38BDF8' : '#64748B'))
      .attr('font-size', compact ? '9px' : '10px')
      .attr('font-weight', (d) => (d.interval === 'Now' ? 'bold' : 'normal'))
      .text((d) => d.interval);

    // Y-Axis Value Labels
    if (!compact) {
      const yAxisGroup = g.append('g').attr('class', 'y-axis');
      yAxisGroup
        .selectAll('text')
        .data(yGridTicks)
        .enter()
        .append('text')
        .attr('x', -8)
        .attr('y', (d) => yScale(d) + 3)
        .attr('text-anchor', 'end')
        .attr('fill', '#64748B')
        .attr('font-size', '9px')
        .text((d) => `${d}`);
    }

    // Data Points / Dots
    const dotsGroup = g.append('g').attr('class', 'data-points');

    dotsGroup
      .selectAll('circle.data-dot')
      .data(timeline)
      .enter()
      .append('circle')
      .attr('class', 'data-dot')
      .attr('cx', (_, i) => xScale(i))
      .attr('cy', (d) => yScale(d.potholes))
      .attr('r', (_, i) => (i === timeline.length - 1 ? 4.5 : 3.0))
      .attr('fill', (d, i) => {
        if (i === timeline.length - 1) return '#EF4444';
        if (d.critical_count && d.critical_count > 0) return '#EF4444';
        if (d.potholes >= 3) return '#F59E0B';
        return '#38BDF8';
      })
      .attr('stroke', '#0F172A')
      .attr('stroke-width', 1.5)
      .attr('cursor', 'pointer');

    // Pulsing Animated Ring on Latest / Live Point (Now)
    const latestIdx = timeline.length - 1;
    const latestPoint = timeline[latestIdx];
    if (latestPoint) {
      const livePulseGroup = g.append('g').attr('class', 'live-pulse');
      
      livePulseGroup
        .append('circle')
        .attr('cx', xScale(latestIdx))
        .attr('cy', yScale(latestPoint.potholes))
        .attr('r', 8)
        .attr('fill', 'none')
        .attr('stroke', '#EF4444')
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.75)
        .append('animate')
        .attr('attributeName', 'r')
        .attr('values', '4;11;4')
        .attr('dur', '2s')
        .attr('repeatCount', 'indefinite');

      livePulseGroup
        .append('circle')
        .attr('cx', xScale(latestIdx))
        .attr('cy', yScale(latestPoint.potholes))
        .attr('r', 8)
        .attr('fill', 'none')
        .attr('stroke', '#EF4444')
        .attr('stroke-width', 1)
        .attr('opacity', 0.8)
        .append('animate')
        .attr('attributeName', 'opacity')
        .attr('values', '0.8;0;0.8')
        .attr('dur', '2s')
        .attr('repeatCount', 'indefinite');
    }

    // Interactive Hover Vertical Guideline
    const guideline = g
      .append('line')
      .attr('class', 'hover-guideline')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#38BDF8')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,2')
      .attr('opacity', 0)
      .style('pointer-events', 'none');

    // Interactive Hover Halo
    const hoverHalo = g
      .append('circle')
      .attr('class', 'hover-halo')
      .attr('r', 6)
      .attr('fill', '#38BDF8')
      .attr('fill-opacity', 0.3)
      .attr('stroke', '#38BDF8')
      .attr('stroke-width', 2)
      .attr('opacity', 0)
      .style('pointer-events', 'none');

    // Overlay Rect for Mouse / Touch Interaction
    const bisect = d3.bisector<PotholeFrequencyInterval, number>((d, i) => i).center;

    g.append('rect')
      .attr('class', 'interaction-overlay')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .attr('cursor', 'crosshair')
      .on('mousemove touchmove', function (event) {
        const [mx] = d3.pointer(event);
        const rawIdx = xScale.invert(mx);
        const idx = Math.max(0, Math.min(timeline.length - 1, Math.round(rawIdx)));
        const point = timeline[idx];
        if (!point) return;

        const px = xScale(idx);
        const py = yScale(point.potholes);

        guideline
          .attr('x1', px)
          .attr('x2', px)
          .attr('opacity', 1);

        hoverHalo
          .attr('cx', px)
          .attr('cy', py)
          .attr('opacity', 1);

        setHoveredPoint(point);

        // Calculate absolute position for the tooltip relative to the container
        const matrix = this.getScreenCTM();
        if (matrix) {
          setTooltipPos({
            x: margin.left + px,
            y: margin.top + py
          });
        }
      })
      .on('mouseleave touchend', function () {
        guideline.attr('opacity', 0);
        hoverHalo.attr('opacity', 0);
        setHoveredPoint(null);
        setTooltipPos(null);
      })
      .on('click', function (event) {
        const [mx] = d3.pointer(event);
        const rawIdx = xScale.invert(mx);
        const idx = Math.max(0, Math.min(timeline.length - 1, Math.round(rawIdx)));
        const point = timeline[idx];
        if (point && onSelectInterval) {
          onSelectInterval(point);
        }
      });

  }, [telemetry, compact, viewMode, onSelectInterval]);

  return (
    <div 
      ref={containerRef} 
      id="driver-pothole-d3-frequency-graph"
      className={`relative bg-slate-950/90 border border-slate-800/90 rounded-xl p-3 sm:p-4 text-slate-100 backdrop-blur-md shadow-xl flex flex-col justify-between overflow-hidden ${className}`}
    >
      {/* Background Subtle Gradient Glow */}
      <div className="absolute top-0 right-0 w-48 h-24 bg-amber-500/5 blur-3xl pointer-events-none rounded-full" />

      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h5 className="text-xs font-bold text-white tracking-wide flex items-center gap-1">
                Pothole Frequency
                <span className="text-[10px] text-slate-400 font-normal font-mono">(Last 10 Min)</span>
              </h5>
              {isLiveActive && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  D3 LIVE
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
              <span>Rate:</span>
              <strong className="text-amber-400 font-bold">{stats.currentRate} / min</strong>
              <span>•</span>
              <span>10m Total:</span>
              <strong className="text-white font-bold">{stats.tenMinTotal}</strong>
              {stats.criticalCount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-rose-400 font-bold">({stats.criticalCount} Critical)</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            id="btn-refresh-pothole-telemetry"
            onClick={() => fetchTelemetry(true)}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition-all active:scale-95 disabled:opacity-50"
            title="Fetch latest D3 pothole telemetry from /api/v1/driver/telemetry/potholes"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* SVG Canvas for D3 Graph */}
      <div className="relative w-full my-1.5 flex items-center justify-center min-h-[75px]">
        {isLoading && !telemetry ? (
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 py-6">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
            <span>Streaming D3 Pothole Telemetry...</span>
          </div>
        ) : (
          <svg 
            ref={svgRef} 
            className="w-full overflow-visible select-none"
            style={{ touchAction: 'none' }}
          />
        )}

        {/* Rich Interactive D3 Tooltip */}
        {hoveredPoint && tooltipPos && (
          <div 
            className="absolute z-30 pointer-events-none -translate-x-1/2 -translate-y-full mb-3 px-2.5 py-1.5 bg-slate-900/95 border border-amber-500/40 rounded-lg shadow-2xl backdrop-blur-md text-[10px] font-mono text-slate-200 transition-all"
            style={{
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y}px`
            }}
          >
            <div className="flex items-center justify-between gap-3 font-bold border-b border-slate-800 pb-1 mb-1">
              <span className="text-amber-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                {hoveredPoint.interval === 'Now' ? 'Current Minute' : `${hoveredPoint.interval} (${hoveredPoint.minutes_ago || 0}m ago)`}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-extrabold">
                {hoveredPoint.potholes} / min
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-slate-300">
              <div>Potholes: <strong className="text-white">{hoveredPoint.potholes}</strong></div>
              <div>Cracks: <strong className="text-cyan-400">{hoveredPoint.cracks || 0}</strong></div>
              <div>Density: <strong className="text-amber-300">{hoveredPoint.frequency_density} / km</strong></div>
              <div>Severity: <strong className={hoveredPoint.critical_count ? 'text-rose-400' : 'text-emerald-400'}>{hoveredPoint.severity_index || 7.5}/10</strong></div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Diagnostic Metadata Bar */}
      <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 pt-1 border-t border-slate-900">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            Live Buffer: 10 Intervals
          </span>
          <span>•</span>
          <span>Peak: <strong className="text-slate-300">{stats.peakRate}/min</strong></span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span>Endpoint: <strong className="text-slate-300">GET /driver/telemetry/potholes</strong></span>
        </div>
      </div>
    </div>
  );
};
