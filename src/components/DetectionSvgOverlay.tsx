import React, { useState } from 'react';

export interface OverlayDetection {
  id?: string;
  category: string;
  type?: string;
  confidence: number;
  severity?: string;
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
  box?: [number, number, number, number];
  width?: number;
  height?: number;
  label?: string;
}

interface DetectionSvgOverlayProps {
  detections: OverlayDetection[];
  frameWidth?: number;
  frameHeight?: number;
  showLabels?: boolean;
  showConfidence?: boolean;
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
  detections = [],
  frameWidth = 1280,
  frameHeight = 720,
  showLabels = true,
  showConfidence = true,
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

    // 1. Potholes & Severe Damage
    if (cat.includes('pothole') || (t === 'damage' && sev.includes('CRITICAL'))) {
      return {
        stroke: '#FF3B30',
        fill: 'rgba(255, 59, 48, 0.12)',
        badgeBg: '#FF3B30',
        textColor: '#FFFFFF',
        label: 'POTHOLE',
        iconName: 'pothole',
        severityLevel: 'CRITICAL'
      };
    }

    // 2. Cracks & Road Surface Defects
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

    // 3. Vehicles & Traffic Objects
    if (cat.includes('car') || cat.includes('truck') || cat.includes('bus') || cat.includes('motorcycle') || cat.includes('bicycle') || cat.includes('person') || t === 'vehicle') {
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

    // 4. Helmets & Safety Gear
    if (cat.includes('helmet')) {
      return {
        stroke: '#FFD60A',
        fill: 'rgba(255, 214, 10, 0.12)',
        badgeBg: '#E5B800',
        textColor: '#000000',
        label: 'HELMET COMPLIANT',
        iconName: 'helmet',
        severityLevel: 'SAFE'
      };
    }

    // 5. License Plates / ANPR
    if (cat.includes('plate') || cat.includes('number_plate')) {
      return {
        stroke: '#34C759',
        fill: 'rgba(52, 199, 89, 0.15)',
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

  // Filter detections based on category and confidence
  const activeDetections = detections.filter((det) => {
    if (det.confidence < minConfidence) return false;
    if (filterCategory !== 'all') {
      const cat = (det.category || '').toLowerCase();
      const filt = filterCategory.toLowerCase();
      if (!cat.includes(filt) && (det.type || '').toLowerCase() !== filt) {
        return false;
      }
    }
    return true;
  });

  const baseWidth = frameWidth > 0 ? frameWidth : 1280;
  const baseHeight = frameHeight > 0 ? frameHeight : 720;

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

      {activeDetections.map((det, index) => {
        // Extract Coordinates (supporting pixel coordinates or 0-1 normalized coordinates)
        let x1 = det.x_min !== undefined ? det.x_min : (det.box ? det.box[0] : 0);
        let y1 = det.y_min !== undefined ? det.y_min : (det.box ? det.box[1] : 0);
        let x2 = det.x_max !== undefined ? det.x_max : (det.box ? det.box[2] : 0);
        let y2 = det.y_max !== undefined ? det.y_max : (det.box ? det.box[3] : 0);

        // Normalize if coordinates are given as fractions (0.0 to 1.0)
        if (x1 <= 1.0 && x2 <= 1.0 && (x2 > 0 || y2 > 0)) {
          x1 = x1 * baseWidth;
          y1 = y1 * baseHeight;
          x2 = x2 * baseWidth;
          y2 = y2 * baseHeight;
        }

        // Clamp boundaries
        x1 = Math.max(0, Math.min(baseWidth - 10, x1));
        y1 = Math.max(0, Math.min(baseHeight - 10, y1));
        x2 = Math.max(x1 + 10, Math.min(baseWidth, x2));
        y2 = Math.max(y1 + 10, Math.min(baseHeight, y2));

        const boxW = Math.max(12, x2 - x1);
        const boxH = Math.max(12, y2 - y1);

        const style = getCategoryStyle(det.category, det.type, det.severity);
        const isHovered = hoveredIdx === index;
        const isSelected = selectedDetectionId === (det.id || `det-${index}`);

        // Corner bracket size
        const bracketLen = Math.min(18, Math.max(6, Math.floor(Math.min(boxW, boxH) * 0.22)));
        const strokeWidth = isSelected || isHovered ? 3 : 2;
        const confPercent = Math.round((det.confidence || 0.85) * 100);
        const labelText = `${style.label} ${confPercent}%`;
        const badgeWidth = Math.max(75, labelText.length * 7.5 + 16);
        const badgeHeight = 20;

        // Position badge above box, or inside if too close to top edge
        const badgeY = y1 >= badgeHeight + 2 ? y1 - badgeHeight - 2 : y1 + 2;
        const badgeX = Math.min(x1, baseWidth - badgeWidth - 4);

        return (
          <g
            key={det.id || `svg-bbox-${index}-${x1}-${y1}`}
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

            {/* 5. Header Label Badge */}
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
