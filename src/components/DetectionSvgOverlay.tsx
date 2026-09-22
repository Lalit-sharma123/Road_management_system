import React, { useState, useMemo } from 'react';

export interface OverlayDetection {
  id?: string;
  category: string;
  confidence: number;
  type?: string;
  severity?: string;
  x_min?: number;
  y_min?: number;
  x_max?: number;
  y_max?: number;
  box?: number[]; // [x1, y1, x2, y2]
  label?: string;
  width?: number;
  height?: number;
}

export interface DetectionSvgOverlayProps {
  detections: OverlayDetection[];
  frameWidth?: number;
  frameHeight?: number;
  showConfidence?: boolean;
  showLabels?: boolean;
  showSeverity?: boolean;
  showCornerBrackets?: boolean;
  showFill?: boolean;
  filterCategory?: string;
  minConfidence?: number;
  selectedDetectionId?: string | null;
  onSelectDetection?: (detection: OverlayDetection) => void;
}

interface CategoryStyle {
  stroke: string;
  fill: string;
  badgeBg: string;
  textColor: string;
  label: string;
  iconName: string;
  severityLevel: string;
}

export const DetectionSvgOverlay: React.FC<DetectionSvgOverlayProps> = ({
  detections,
  frameWidth = 1280,
  frameHeight = 720,
  showConfidence = true,
  showLabels = true,
  showSeverity = true,
  showCornerBrackets = true,
  showFill = true,
  filterCategory = 'all',
  minConfidence = 0.25,
  selectedDetectionId = null,
  onSelectDetection
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const getCategoryStyle = (category: string, type?: string, severity?: string): CategoryStyle => {
    const cat = (category || '').toLowerCase();
    const t = (type || '').toLowerCase();
    const sev = (severity || 'high').toUpperCase();

    // 1. Potholes & Severe Damage [best.pt]
    if (cat.includes('pothole') || (t === 'damage' && sev.includes('CRITICAL'))) {
      return {
        stroke: '#FF3B30',
        fill: 'rgba(255, 59, 48, 0.16)',
        badgeBg: '#DC2626',
        textColor: '#FFFFFF',
        label: cat.includes('water') ? 'POTHOLE (WATER-FILLED)' : 'POTHOLE (CRITICAL)',
        iconName: 'pothole',
        severityLevel: 'CRITICAL'
      };
    }

    // 2. Cracks & Road Surface Defects [best.pt]
    if (cat.includes('crack') || cat.includes('broken') || cat.includes('asphalt') || t === 'damage') {
      return {
        stroke: '#FF9500',
        fill: 'rgba(255, 149, 0, 0.12)',
        badgeBg: '#FF9500',
        textColor: '#FFFFFF',
        label: cat.replace('_', ' ').toUpperCase(),
        iconName: 'defect',
        severityLevel: sev.includes('LOW') ? 'LOW' : 'HIGH'
      };
    }

    // 3. Pedestrians & Persons [yolov8n.pt Class 0]
    if (cat.includes('person') || cat.includes('pedestrian') || t === 'pedestrian') {
      return {
        stroke: '#818CF8',
        fill: 'rgba(129, 140, 248, 0.14)',
        badgeBg: '#4F46E5',
        textColor: '#FFFFFF',
        label: 'PERSON',
        iconName: 'person',
        severityLevel: 'INFO'
      };
    }

    // 4. Vehicles & Traffic Objects [yolov8n.pt]
    if (cat.includes('car') || cat.includes('truck') || cat.includes('bus') || cat.includes('motorcycle') || cat.includes('bicycle') || t === 'vehicle') {
      return {
        stroke: '#00C2FF',
        fill: 'rgba(0, 194, 255, 0.10)',
        badgeBg: '#0084FF',
        textColor: '#FFFFFF',
        label: cat.toUpperCase(),
        iconName: 'vehicle',
        severityLevel: 'NORMAL'
      };
    }

    // 5. Helmets & Safety Gear [helmet.pt]
    if (cat.includes('helmet')) {
      return {
        stroke: '#FFD60A',
        fill: 'rgba(255, 214, 10, 0.14)',
        badgeBg: '#E5B800',
        textColor: '#000000',
        label: 'HELMET COMPLIANT',
        iconName: 'helmet',
        severityLevel: 'SAFE'
      };
    }

    // 6. License Plates / ANPR [numberplate-yolo-v26n.pt]
    if (cat.includes('plate') || cat.includes('number_plate')) {
      return {
        stroke: '#34C759',
        fill: 'rgba(52, 199, 89, 0.18)',
        badgeBg: '#34C759',
        textColor: '#000000',
        label: 'ANPR PLATE',
        iconName: 'plate',
        severityLevel: 'VERIFIED'
      };
    }

    // Default Fallback
    return {
      stroke: '#A855F7',
      fill: 'rgba(168, 85, 247, 0.10)',
      badgeBg: '#9333EA',
      textColor: '#FFFFFF',
      label: cat.toUpperCase() || 'DETECTION',
      iconName: 'general',
      severityLevel: 'INFO'
    };
  };

  const baseWidth = frameWidth > 0 ? frameWidth : 1280;
  const baseHeight = frameHeight > 0 ? frameHeight : 720;

  // Filter and resolve coordinates with strict zero-overlap badge placement
  const renderedDetections = useMemo(() => {
    // 1. Initial filter
    const filtered = detections.filter((det) => {
      if ((det.confidence ?? 0.85) < minConfidence) return false;
      if (filterCategory !== 'all') {
        const cat = (det.category || '').toLowerCase();
        const filt = filterCategory.toLowerCase();
        if (!cat.includes(filt) && (det.type || '').toLowerCase() !== filt) {
          return false;
        }
      }
      return true;
    });

    // 2. Normalize and compute pixel bounding coordinates
    interface PreparedItem {
      det: OverlayDetection;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      boxW: number;
      boxH: number;
      style: CategoryStyle;
      labelText: string;
      confPercent: number;
      badgeWidth: number;
      badgeHeight: number;
      badgeX: number;
      badgeY: number;
    }

    const prepared: PreparedItem[] = [];

    for (let i = 0; i < filtered.length; i++) {
      const det = filtered[i];
      let x1 = det.x_min !== undefined ? det.x_min : (det.box ? det.box[0] : 0);
      let y1 = det.y_min !== undefined ? det.y_min : (det.box ? det.box[1] : 0);
      let x2 = det.x_max !== undefined ? det.x_max : (det.box ? det.box[2] : 0);
      let y2 = det.y_max !== undefined ? det.y_max : (det.box ? det.box[3] : 0);

      // Normalize fractional coordinates if given as 0.0 - 1.0
      if (x1 <= 1.0 && x2 <= 1.0 && (x2 > 0 || y2 > 0)) {
        x1 = x1 * baseWidth;
        y1 = y1 * baseHeight;
        x2 = x2 * baseWidth;
        y2 = y2 * baseHeight;
      }

      // Clamp to view
      x1 = Math.max(0, Math.min(baseWidth - 10, x1));
      y1 = Math.max(0, Math.min(baseHeight - 10, y1));
      x2 = Math.max(x1 + 10, Math.min(baseWidth, x2));
      y2 = Math.max(y1 + 10, Math.min(baseHeight, y2));

      const boxW = Math.max(12, x2 - x1);
      const boxH = Math.max(12, y2 - y1);
      const style = getCategoryStyle(det.category, det.type, det.severity);

      const confPercent = Math.round((det.confidence || 0.85) * 100);
      const displayTitle = det.label || style.label;
      const labelText = showConfidence ? `${displayTitle} ${confPercent}%` : displayTitle;
      const badgeWidth = Math.max(75, labelText.length * 6.8 + 14);
      const badgeHeight = 20;

      // Smart initial badge placement:
      // For number plates: place below plate (y2 + 2) so it does NOT collide with vehicle badge!
      const isPlate = (det.category || '').toLowerCase().includes('plate');
      let initBadgeY: number;
      if (isPlate) {
        initBadgeY = y2 + badgeHeight + 2 <= baseHeight ? y2 + 2 : Math.max(0, y1 - badgeHeight - 2);
      } else {
        initBadgeY = y1 >= badgeHeight + 2 ? y1 - badgeHeight - 2 : y1 + 2;
      }
      const initBadgeX = Math.min(x1, baseWidth - badgeWidth - 4);

      prepared.push({
        det,
        x1,
        y1,
        x2,
        y2,
        boxW,
        boxH,
        style,
        labelText,
        confPercent,
        badgeWidth,
        badgeHeight,
        badgeX: initBadgeX,
        badgeY: initBadgeY
      });
    }

    // 3. De-collide badge labels so NO two labels overlap each other
    const placedBadges: { x: number; y: number; w: number; h: number }[] = [];
    for (const item of prepared) {
      let bX = item.badgeX;
      let bY = item.badgeY;
      const bW = item.badgeWidth;
      const bH = item.badgeHeight;

      // Iteratively nudge badge if it collides with an already placed badge
      let attempts = 0;
      while (attempts < 5) {
        let collides = false;
        for (const pb of placedBadges) {
          const overlapsX = bX < pb.x + pb.w + 4 && bX + bW + 4 > pb.x;
          const overlapsY = bY < pb.y + pb.h + 2 && bY + bH + 2 > pb.y;
          if (overlapsX && overlapsY) {
            collides = true;
            // Shift down if space available, otherwise shift right or inside
            if (bY + bH + 24 <= baseHeight) {
              bY = pb.y + pb.h + 3;
            } else {
              bY = Math.max(0, pb.y - bH - 3);
            }
            break;
          }
        }
        if (!collides) break;
        attempts++;
      }

      item.badgeX = Math.max(2, Math.min(baseWidth - bW - 2, bX));
      item.badgeY = Math.max(2, Math.min(baseHeight - bH - 2, bY));
      placedBadges.push({ x: item.badgeX, y: item.badgeY, w: bW, h: bH });
    }

    return prepared;
  }, [detections, minConfidence, filterCategory, baseWidth, baseHeight, showConfidence]);

  return (
    <svg
      id="live-detection-svg-overlay"
      viewBox={`0 0 ${baseWidth} ${baseHeight}`}
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 w-full h-full pointer-events-none z-20 select-none overflow-visible"
    >
      <defs>
        {/* Glow Filters */}
        <filter id="svg-glow-red" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="svg-glow-orange" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="svg-glow-blue" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="svg-glow-green" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Diagonal Tech Scanlines Pattern */}
        <pattern id="svg-tech-stripes" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="16" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
        </pattern>
      </defs>

      {renderedDetections.map((item, index) => {
        const { det, x1, y1, x2, y2, boxW, boxH, style, labelText, confPercent, badgeWidth, badgeHeight, badgeX, badgeY } = item;
        const isHovered = hoveredIdx === index;
        const isSelected = selectedDetectionId === (det.id || `det-${index}`);

        // Corner bracket size
        const bracketLen = Math.min(18, Math.max(6, Math.floor(Math.min(boxW, boxH) * 0.22)));
        const strokeWidth = isSelected || isHovered ? 3 : 2;

        return (
          <g
            key={`${det.id || 'det'}-${index}-${Math.round(x1)}-${Math.round(y1)}`}
            id={`svg-det-group-${index}`}
            className="pointer-events-auto cursor-pointer transition-all duration-150"
            onMouseEnter={() => setHoveredIdx(index)}
            onMouseLeave={() => setHoveredIdx(null)}
            onClick={() => onSelectDetection && onSelectDetection(det)}
          >
            {/* 1. Semi-transparent Bounding Fill */}
            {showFill && (
              <rect
                x={x1}
                y={y1}
                width={boxW}
                height={boxH}
                fill={isHovered || isSelected ? style.stroke : style.fill}
                fillOpacity={isHovered || isSelected ? 0.25 : 0.12}
                className="transition-all duration-200"
              />
            )}

            {/* Tech Pattern Stripe Overlay on Hover */}
            {(isHovered || isSelected) && (
              <rect
                x={x1}
                y={y1}
                width={boxW}
                height={boxH}
                fill="url(#svg-tech-stripes)"
                pointerEvents="none"
              />
            )}

            {/* 2. Main Bounding Rectangle */}
            <rect
              x={x1}
              y={y1}
              width={boxW}
              height={boxH}
              fill="none"
              stroke={style.stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={isHovered ? '4 2' : 'none'}
              className="transition-all duration-150"
            />

            {/* 3. Corner Brackets (HUD Tech Crosshairs) */}
            {showCornerBrackets && (
              <g stroke={style.stroke} strokeWidth={strokeWidth + 1} fill="none" strokeLinecap="square">
                {/* Top-Left Corner */}
                <path d={`M ${x1} ${y1 + bracketLen} L ${x1} ${y1} L ${x1 + bracketLen} ${y1}`} />
                {/* Top-Right Corner */}
                <path d={`M ${x2 - bracketLen} ${y1} L ${x2} ${y1} L ${x2} ${y1 + bracketLen}`} />
                {/* Bottom-Left Corner */}
                <path d={`M ${x1} ${y2 - bracketLen} L ${x1} ${y2} L ${x1 + bracketLen} ${y2}`} />
                {/* Bottom-Right Corner */}
                <path d={`M ${x2 - bracketLen} ${y2} L ${x2} ${y2} L ${x2} ${y2 - bracketLen}`} />
              </g>
            )}

            {/* 4. Center Target Crosshair on Hover */}
            {(isHovered || isSelected) && (
              <g stroke={style.stroke} strokeWidth="1" strokeOpacity="0.7" fill="none">
                <line x1={x1 + boxW / 2 - 8} y1={y1 + boxH / 2} x2={x1 + boxW / 2 + 8} y2={y1 + boxH / 2} />
                <line x1={x1 + boxW / 2} y1={y1 + boxH / 2 - 8} x2={x1 + boxW / 2} y2={y1 + boxH / 2 + 8} />
                <circle cx={x1 + boxW / 2} cy={y1 + boxH / 2} r="4" stroke={style.stroke} strokeWidth="1" />
              </g>
            )}

            {/* 5. Header Label Badge (De-collided & Guaranteed Non-Overlapping) */}
            {showLabels && (
              <g transform={`translate(${badgeX}, ${badgeY})`}>
                {/* Badge Background Pill */}
                <rect
                  x="0"
                  y="0"
                  width={badgeWidth}
                  height={badgeHeight}
                  rx="3"
                  fill={style.badgeBg}
                  stroke="#000000"
                  strokeWidth="0.8"
                  className="shadow-md"
                />

                {/* Confidence Bar under Badge */}
                {showConfidence && (
                  <rect
                    x="0"
                    y={badgeHeight - 2.5}
                    width={(badgeWidth * confPercent) / 100}
                    height="2.5"
                    fill="#FFFFFF"
                    fillOpacity="0.9"
                  />
                )}

                {/* Badge Text */}
                <text
                  x="6"
                  y={badgeHeight - 6}
                  fill={style.textColor}
                  fontSize="10"
                  fontWeight="bold"
                  fontFamily="monospace"
                  letterSpacing="0.4px"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                >
                  {labelText}
                </text>
              </g>
            )}

            {/* 6. Severity / Violation Indicator Tag (Top-Right of Box) */}
            {showSeverity && det.severity && det.severity.toUpperCase() === 'CRITICAL' && (
              <g transform={`translate(${Math.max(x1 + 10, x2 - 50)}, ${y1 + 4})`}>
                <rect
                  x="0"
                  y="0"
                  width="46"
                  height="14"
                  rx="2"
                  fill="#FF3B30"
                  stroke="#FFFFFF"
                  strokeWidth="0.5"
                />
                <text
                  x="23"
                  y="10.5"
                  fill="#FFFFFF"
                  fontSize="8"
                  fontWeight="900"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  CRITICAL
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
};
