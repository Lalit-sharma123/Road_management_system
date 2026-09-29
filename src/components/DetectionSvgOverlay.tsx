import React, { useState, useMemo } from 'react';

/**
 * Standard Detection Data Structure conforming to Requirement 9:
 * {
 *   id,
 *   model,
 *   className,
 *   confidence,
 *   bbox: { x, y, width, height },
 *   parentVehicleId,
 *   plateNumber,
 *   plateConfidence
 * }
 */
export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
  // Backward compatibility fields
  x_min?: number;
  y_min?: number;
  x_max?: number;
  y_max?: number;
}

export interface OverlayDetection {
  id?: string;
  model?: string;
  className?: string;
  category: string;
  confidence: number;
  type?: string;
  severity?: string;
  bbox?: BBox | { x_min?: number; y_min?: number; x_max?: number; y_max?: number; x?: number; y?: number; width?: number; height?: number };
  x_min?: number;
  y_min?: number;
  x_max?: number;
  y_max?: number;
  box?: number[]; // [x1, y1, x2, y2]
  label?: string;
  width?: number;
  height?: number;
  parentVehicleId?: string | null;
  plateNumber?: string;
  plateConfidence?: number;
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
  glowId: string;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PreparedItem {
  det: OverlayDetection;
  id: string;
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
  isVehicle: boolean;
  isPlate: boolean;
  parentVehicleId: string | null;
  plateNumber?: string;
  plateConfidence?: number;
}

/**
 * Geometric helper: Compute Intersection-over-Union (IoU) between two bounding boxes
 */
function computeIoU(
  b1: { x1: number; y1: number; x2: number; y2: number },
  b2: { x1: number; y1: number; x2: number; y2: number }
): number {
  const ix1 = Math.max(b1.x1, b2.x1);
  const iy1 = Math.max(b1.y1, b2.y1);
  const ix2 = Math.min(b1.x2, b2.x2);
  const iy2 = Math.min(b1.y2, b2.y2);

  if (ix2 <= ix1 || iy2 <= iy1) return 0;

  const interArea = (ix2 - ix1) * (iy2 - iy1);
  const a1 = (b1.x2 - b1.x1) * (b1.y2 - b1.y1);
  const a2 = (b2.x2 - b2.x1) * (b2.y2 - b2.y1);
  const unionArea = a1 + a2 - interArea;

  return unionArea > 0 ? interArea / unionArea : 0;
}

/**
 * Geometric helper: Calculate containment ratio (fraction of box1 contained inside box2)
 */
function computeContainment(
  child: { x1: number; y1: number; x2: number; y2: number },
  parent: { x1: number; y1: number; x2: number; y2: number }
): number {
  const ix1 = Math.max(child.x1, parent.x1);
  const iy1 = Math.max(child.y1, parent.y1);
  const ix2 = Math.min(child.x2, parent.x2);
  const iy2 = Math.min(child.y2, parent.y2);

  if (ix2 <= ix1 || iy2 <= iy1) return 0;

  const interArea = (ix2 - ix1) * (iy2 - iy1);
  const childArea = (child.x2 - child.x1) * (child.y2 - child.y1);

  return childArea > 0 ? interArea / childArea : 0;
}

/**
 * Check if two label badge rectangles collide (with a safety margin)
 */
function rectsCollide(r1: Rect, r2: Rect, pad: number = 2): boolean {
  return (
    r1.x < r2.x + r2.w + pad &&
    r1.x + r1.w + pad > r2.x &&
    r1.y < r2.y + r2.h + pad &&
    r1.y + r1.h + pad > r2.y
  );
}

/**
 * Calculate overlap area in square pixels between two rectangles
 */
function overlapArea(r1: Rect, r2: Rect): number {
  const ix1 = Math.max(r1.x, r2.x);
  const iy1 = Math.max(r1.y, r2.y);
  const ix2 = Math.min(r1.x + r1.w, r2.x + r2.w);
  const iy2 = Math.min(r1.y + r1.h, r2.y + r2.h);

  if (ix2 <= ix1 || iy2 <= iy1) return 0;
  return (ix2 - ix1) * (iy2 - iy1);
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
  minConfidence = 0.20,
  selectedDetectionId = null,
  onSelectDetection
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const baseWidth = frameWidth > 0 ? frameWidth : 1280;
  const baseHeight = frameHeight > 0 ? frameHeight : 720;

  const getCategoryStyle = (category: string, type?: string, severity?: string): CategoryStyle => {
    const cat = (category || '').toLowerCase();
    const t = (type || '').toLowerCase();
    const sev = (severity || 'high').toUpperCase();

    // 1. Potholes & Severe Road Surface Damage [best.pt]
    if (cat.includes('pothole') || (t === 'damage' && sev.includes('CRITICAL'))) {
      return {
        stroke: '#FF3B30',
        fill: 'rgba(255, 59, 48, 0.16)',
        badgeBg: '#DC2626',
        textColor: '#FFFFFF',
        label: cat.includes('water') ? 'Pothole (Water)' : 'Pothole',
        iconName: 'pothole',
        severityLevel: 'CRITICAL',
        glowId: 'svg-glow-red'
      };
    }

    // 2. Cracks & Road Surface Defects [best.pt]
    if (cat.includes('crack') || cat.includes('broken') || cat.includes('asphalt') || t === 'damage') {
      return {
        stroke: '#FF9500',
        fill: 'rgba(255, 149, 0, 0.12)',
        badgeBg: '#EA580C',
        textColor: '#FFFFFF',
        label: cat.includes('longitudinal') ? 'Long. Crack' : cat.includes('transverse') ? 'Trans. Crack' : 'Road Defect',
        iconName: 'defect',
        severityLevel: sev.includes('LOW') ? 'LOW' : 'HIGH',
        glowId: 'svg-glow-orange'
      };
    }

    // 3. Vehicles & Traffic Objects [yolov8n.pt]
    if (cat.includes('car') || cat.includes('truck') || cat.includes('bus') || cat.includes('motorcycle') || cat.includes('bicycle') || t === 'vehicle') {
      const vLabel = cat.includes('truck') ? 'Truck' : cat.includes('bus') ? 'Bus' : cat.includes('motorcycle') ? 'Motorcycle' : 'Car';
      return {
        stroke: '#00C2FF',
        fill: 'rgba(0, 194, 255, 0.10)',
        badgeBg: '#0284C7',
        textColor: '#FFFFFF',
        label: vLabel,
        iconName: 'vehicle',
        severityLevel: 'NORMAL',
        glowId: 'svg-glow-blue'
      };
    }

    // 4. License Plates / ANPR [numberplate-yolo-v26n.pt]
    if (cat.includes('plate') || cat.includes('number_plate') || t === 'plate' || t === 'anpr') {
      return {
        stroke: '#34C759',
        fill: 'rgba(52, 199, 89, 0.20)',
        badgeBg: '#16A34A',
        textColor: '#FFFFFF',
        label: 'Plate',
        iconName: 'plate',
        severityLevel: 'VERIFIED',
        glowId: 'svg-glow-green'
      };
    }

    // 5. Helmets & Safety Gear [helmet.pt]
    if (cat.includes('helmet')) {
      const isCompliant = !cat.includes('no_helmet');
      return {
        stroke: isCompliant ? '#FFD60A' : '#EF4444',
        fill: isCompliant ? 'rgba(255, 214, 10, 0.14)' : 'rgba(239, 68, 68, 0.18)',
        badgeBg: isCompliant ? '#D97706' : '#B91C1C',
        textColor: '#FFFFFF',
        label: isCompliant ? 'Helmet' : 'No Helmet',
        iconName: 'helmet',
        severityLevel: isCompliant ? 'SAFE' : 'VIOLATION',
        glowId: 'svg-glow-yellow'
      };
    }

    // 6. Pedestrians & Persons [yolov8n.pt Class 0]
    if (cat.includes('person') || cat.includes('pedestrian') || t === 'pedestrian') {
      return {
        stroke: '#818CF8',
        fill: 'rgba(129, 140, 248, 0.14)',
        badgeBg: '#4F46E5',
        textColor: '#FFFFFF',
        label: 'Person',
        iconName: 'person',
        severityLevel: 'INFO',
        glowId: 'svg-glow-blue'
      };
    }

    // Default Fallback
    return {
      stroke: '#A855F7',
      fill: 'rgba(168, 85, 247, 0.10)',
      badgeBg: '#7E22CE',
      textColor: '#FFFFFF',
      label: cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : 'Detection',
      iconName: 'general',
      severityLevel: 'INFO',
      glowId: 'svg-glow-blue'
    };
  };

  /**
   * Main Transformation Pipeline:
   * 1. Coordinate normalization (fractional vs pixel)
   * 2. Strict deduplication (NMS for same-category detections, preserving separate potholes & cars)
   * 3. Vehicle ↔ License Plate association (containment + proximity)
   * 4. Compact label generation conforming to Requirement 14
   * 5. Collision-aware 6-position label placement conforming to Requirement 5
   */
  const renderedDetections = useMemo(() => {
    // ---------------------------------------------------------
    // STEP 1: Filter by confidence and category
    // ---------------------------------------------------------
    const validDetections = detections.filter((det) => {
      const conf = det.confidence ?? 0.85;
      if (conf < minConfidence) return false;
      if (filterCategory !== 'all') {
        const cat = (det.category || det.className || '').toLowerCase();
        const t = (det.type || '').toLowerCase();
        const filt = filterCategory.toLowerCase();
        if (!cat.includes(filt) && !t.includes(filt)) {
          return false;
        }
      }
      return true;
    });

    // ---------------------------------------------------------
    // STEP 2: Normalize bounding box coordinates
    // ---------------------------------------------------------
    interface NormalizedDet {
      det: OverlayDetection;
      id: string;
      category: string;
      type: string;
      confidence: number;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      boxW: number;
      boxH: number;
      isVehicle: boolean;
      isPlate: boolean;
      isPothole: boolean;
      plateNumber?: string;
      plateConfidence?: number;
      parentVehicleId?: string | null;
    }

    const normalizedList: NormalizedDet[] = [];

    validDetections.forEach((det, idx) => {
      const bbox = det.bbox as any;
      let x1 = 0;
      let y1 = 0;
      let x2 = 0;
      let y2 = 0;

      // Extract coords from standard bbox {x, y, width, height} or legacy fields
      if (bbox && typeof bbox.x === 'number' && typeof bbox.width === 'number') {
        x1 = bbox.x;
        y1 = bbox.y;
        x2 = bbox.x + bbox.width;
        y2 = bbox.y + bbox.height;
      } else if (det.x_min !== undefined && det.x_max !== undefined) {
        x1 = det.x_min;
        y1 = det.y_min ?? 0;
        x2 = det.x_max;
        y2 = det.y_max ?? 0;
      } else if (bbox && bbox.x_min !== undefined) {
        x1 = bbox.x_min;
        y1 = bbox.y_min ?? 0;
        x2 = bbox.x_max;
        y2 = bbox.y_max ?? 0;
      } else if (Array.isArray(det.box) && det.box.length >= 4) {
        x1 = det.box[0];
        y1 = det.box[1];
        x2 = det.box[2];
        y2 = det.box[3];
      }

      // Handle normalized fractional coordinates (0.0 to 1.0)
      if (x1 <= 1.0 && x2 <= 1.0 && (x2 > 0 || y2 > 0)) {
        x1 = x1 * baseWidth;
        y1 = y1 * baseHeight;
        x2 = x2 * baseWidth;
        y2 = y2 * baseHeight;
      }

      // Clamp coordinates to video viewport
      x1 = Math.max(0, Math.min(baseWidth - 10, x1));
      y1 = Math.max(0, Math.min(baseHeight - 10, y1));
      x2 = Math.max(x1 + 10, Math.min(baseWidth, x2));
      y2 = Math.max(y1 + 10, Math.min(baseHeight, y2));

      const boxW = Math.max(10, x2 - x1);
      const boxH = Math.max(10, y2 - y1);

      const cat = (det.category || det.className || '').toLowerCase();
      const typeStr = (det.type || '').toLowerCase();

      const isVehicle = ['car', 'truck', 'bus', 'motorcycle', 'vehicle'].some(k => cat.includes(k) || typeStr === 'vehicle');
      const isPlate = cat.includes('plate') || cat.includes('number_plate') || typeStr === 'plate' || typeStr === 'anpr';
      const isPothole = cat.includes('pothole');

      // Extract plate number and OCR confidence
      let plateNumber = det.plateNumber;
      if (!plateNumber && det.label && isPlate) {
        const match = det.label.match(/(?:Plate\s*[-:]?\s*|ANPR\s*\]?\s*)([A-Z0-9\s]{4,12})/i);
        if (match && match[1]) {
          plateNumber = match[1].trim();
        }
      }

      const detId = det.id || (isPlate ? `det-plate-${idx}` : isVehicle ? `det-veh-${idx}` : isPothole ? `det-pot-${idx}` : `det-${idx}`);

      normalizedList.push({
        det,
        id: detId,
        category: det.category || det.className || (isVehicle ? 'car' : isPlate ? 'number_plate' : 'damage'),
        type: typeStr || (isVehicle ? 'vehicle' : isPlate ? 'plate' : isPothole ? 'damage' : 'general'),
        confidence: det.confidence ?? 0.85,
        x1,
        y1,
        x2,
        y2,
        boxW,
        boxH,
        isVehicle,
        isPlate,
        isPothole,
        plateNumber,
        plateConfidence: det.plateConfidence ?? (plateNumber ? 0.92 : undefined),
        parentVehicleId: det.parentVehicleId || null
      });
    });

    // ---------------------------------------------------------
    // STEP 3: Strict Deduplication (Requirement 10 & 6)
    // Remove true duplicate boxes of the SAME category (IoU > 0.45 or containment > 0.75).
    // Preserve separate potholes (Pothole 1, Pothole 2, Pothole 3...) and separate cars!
    // NEVER drop a license plate because it is inside a car!
    // ---------------------------------------------------------
    const deduplicated: NormalizedDet[] = [];
    // Sort by confidence descending so higher confidence box is retained
    const sorted = [...normalizedList].sort((a, b) => b.confidence - a.confidence);

    for (const item of sorted) {
      let isDuplicate = false;

      for (const kept of deduplicated) {
        // Only deduplicate if they represent the same semantic entity type
        const sameCategory =
          (item.isVehicle && kept.isVehicle) ||
          (item.isPlate && kept.isPlate) ||
          (item.isPothole && kept.isPothole) ||
          (item.category === kept.category);

        if (sameCategory) {
          const iou = computeIoU(
            { x1: item.x1, y1: item.y1, x2: item.x2, y2: item.y2 },
            { x1: kept.x1, y1: kept.y1, x2: kept.x2, y2: kept.y2 }
          );
          const cont = computeContainment(
            { x1: item.x1, y1: item.y1, x2: item.x2, y2: item.y2 },
            { x1: kept.x1, y1: kept.y1, x2: kept.x2, y2: kept.y2 }
          );

          // Standard NMS threshold: only treat as duplicate if significant overlap (IoU > 0.45 or containment > 0.75)
          if (iou > 0.45 || cont > 0.75) {
            isDuplicate = true;
            break;
          }
        }
      }

      if (!isDuplicate) {
        deduplicated.push(item);
      }
    }

    // ---------------------------------------------------------
    // STEP 4: Vehicle ↔ License Plate Association (Requirement 4 & 13)
    // Every detected plate must be associated with its correct vehicle.
    // Use bounding-box containment and spatial bumper proximity.
    // ---------------------------------------------------------
    const vehicles = deduplicated.filter(d => d.isVehicle);
    const assignedVehicles = new Set<string>();

    for (const item of deduplicated) {
      if (item.isPlate) {
        // If already explicitly associated, verify vehicle exists
        if (item.parentVehicleId) {
          const matched = vehicles.find(v => v.id === item.parentVehicleId);
          if (matched) {
            assignedVehicles.add(matched.id);
            continue;
          }
        }

        // Geometric search for the enclosing/closest vehicle
        const pCenterX = (item.x1 + item.x2) / 2;
        const pCenterY = (item.y1 + item.y2) / 2;
        const pBox = { x1: item.x1, y1: item.y1, x2: item.x2, y2: item.y2 };

        let bestVehicle: NormalizedDet | null = null;
        let bestScore = -Infinity;

        for (const veh of vehicles) {
          const vBox = { x1: veh.x1, y1: veh.y1, x2: veh.x2, y2: veh.y2 };
          const containment = computeContainment(pBox, vBox);

          // Pad vehicle boundaries slightly to account for bumper edge / boundary tolerances
          const padX = veh.boxW * 0.15;
          const padY = veh.boxH * 0.20;
          const isCenterInside = (
            pCenterX >= veh.x1 - padX &&
            pCenterX <= veh.x2 + padX &&
            pCenterY >= veh.y1 - padY &&
            pCenterY <= veh.y2 + padY
          );

          if (containment >= 0.25 || isCenterInside) {
            // Proximity: plates are located near the vehicle bumper (lower 30% of vehicle)
            const bumperY = veh.y1 + veh.boxH * 0.75;
            const vCenterX = (veh.x1 + veh.x2) / 2;
            const normDistX = Math.abs(pCenterX - vCenterX) / Math.max(1, veh.boxW);
            const normDistY = Math.abs(pCenterY - bumperY) / Math.max(1, veh.boxH);
            const proximityScore = 1.0 - Math.min(1.0, normDistX * 1.2 + normDistY);

            let score = (containment * 2.0) + proximityScore;
            // Preference for unassigned vehicle
            if (assignedVehicles.has(veh.id)) {
              score -= 0.6;
            }

            if (score > bestScore && score > 0.4) {
              bestScore = score;
              bestVehicle = veh;
            }
          }
        }

        if (bestVehicle) {
          item.parentVehicleId = bestVehicle.id;
          assignedVehicles.add(bestVehicle.id);
        }
      }
    }

    // ---------------------------------------------------------
    // STEP 5: Prepare Badge Design & Geometry (Requirement 14 & 9)
    // Dark/neon style compact badges:
    // [Pothole] 92%
    // [Car] 95%
    // [Plate] ABC1234 91%
    // ---------------------------------------------------------
    const preparedItems: PreparedItem[] = [];

    for (const item of deduplicated) {
      const style = getCategoryStyle(item.category, item.type, item.det.severity);
      const confPercent = Math.round(item.confidence * 100);

      // Construct compact label adhering to Requirement 14
      let labelText: string;
      if (item.isPlate) {
        // Display plate number only when OCR confidence is sufficient (>= 0.70)
        const hasGoodOcr = item.plateNumber && (item.plateConfidence === undefined || item.plateConfidence >= 0.70);
        if (hasGoodOcr) {
          labelText = showConfidence ? `[Plate] ${item.plateNumber} ${confPercent}%` : `[Plate] ${item.plateNumber}`;
        } else {
          labelText = showConfidence ? `[Plate] ${confPercent}%` : '[Plate]';
        }
      } else if (item.isPothole) {
        labelText = showConfidence ? `[Pothole] ${confPercent}%` : '[Pothole]';
      } else if (item.isVehicle) {
        const vTitle = style.label || 'Car';
        labelText = showConfidence ? `[${vTitle}] ${confPercent}%` : `[${vTitle}]`;
      } else {
        const displayTitle = item.det.label || style.label;
        // Strip verbose model prefixes if present for compact readability
        const cleanTitle = displayTitle.replace(/^\[.*?\]\s*/, '').trim();
        labelText = showConfidence ? `[${cleanTitle}] ${confPercent}%` : `[${cleanTitle}]`;
      }

      // Compact badge dimensions: height 18px, width estimated from monospace font
      const charWidth = 6.4;
      const horizontalPadding = 12;
      const badgeWidth = Math.max(68, Math.round(labelText.length * charWidth + horizontalPadding));
      const badgeHeight = 18;

      // Pack into standard structure conforming to Requirement 9
      const standardDet: OverlayDetection = {
        ...item.det,
        id: item.id,
        model: item.det.model || (item.isPothole ? 'best.pt' : item.isVehicle ? 'yolov8n.pt' : item.isPlate ? 'numberplate-yolo-v26n.pt' : 'yolo'),
        className: item.category,
        confidence: item.confidence,
        bbox: {
          x: item.x1,
          y: item.y1,
          width: item.boxW,
          height: item.boxH,
          x_min: item.x1,
          y_min: item.y1,
          x_max: item.x2,
          y_max: item.y2
        },
        parentVehicleId: item.parentVehicleId,
        plateNumber: item.plateNumber,
        plateConfidence: item.plateConfidence
      };

      preparedItems.push({
        det: standardDet,
        id: item.id,
        x1: item.x1,
        y1: item.y1,
        x2: item.x2,
        y2: item.y2,
        boxW: item.boxW,
        boxH: item.boxH,
        style,
        labelText,
        confPercent,
        badgeWidth,
        badgeHeight,
        badgeX: item.x1,
        badgeY: item.y1,
        isVehicle: item.isVehicle,
        isPlate: item.isPlate,
        parentVehicleId: item.parentVehicleId || null,
        plateNumber: item.plateNumber,
        plateConfidence: item.plateConfidence
      });
    }

    // ---------------------------------------------------------
    // STEP 6: Collision-Aware Label Placement System (Requirement 5)
    // Order to test:
    // 1. Above bounding box
    // 2. Below bounding box
    // 3. Top-left
    // 4. Top-right
    // 5. Bottom-left
    // 6. Bottom-right
    // If all positions collide, choose the position with the minimum overlap.
    // Keep labels strictly inside video boundaries.
    // ---------------------------------------------------------
    const placedLabels: Rect[] = [];
    const gap = 3;

    for (const item of preparedItems) {
      const bw = item.badgeWidth;
      const bh = item.badgeHeight;
      const x1 = item.x1;
      const y1 = item.y1;
      const x2 = item.x2;
      const y2 = item.y2;

      // Base candidate positions:
      // Ensure horizontal coord aligns with object but stays inside [2, baseWidth - bw - 2]
      const clampX = (rawX: number) => Math.max(2, Math.min(baseWidth - bw - 2, rawX));
      const clampY = (rawY: number) => Math.max(2, Math.min(baseHeight - bh - 2, rawY));

      interface CandidateSlot {
        name: string;
        rect: Rect;
        isNaturallyInside: boolean;
      }

      // 1. Above bounding box
      const candAbove: Rect = { x: clampX(x1), y: y1 - bh - gap, w: bw, h: bh };
      // 2. Below bounding box
      const candBelow: Rect = { x: clampX(x1), y: y2 + gap, w: bw, h: bh };
      // 3. Top-left (inside box)
      const candTopLeft: Rect = { x: clampX(x1 + gap), y: clampY(y1 + gap), w: bw, h: bh };
      // 4. Top-right (inside box)
      const candTopRight: Rect = { x: clampX(x2 - bw - gap), y: clampY(y1 + gap), w: bw, h: bh };
      // 5. Bottom-left (inside box)
      const candBottomLeft: Rect = { x: clampX(x1 + gap), y: clampY(y2 - bh - gap), w: bw, h: bh };
      // 6. Bottom-right (inside box)
      const candBottomRight: Rect = { x: clampX(x2 - bw - gap), y: clampY(y2 - bh - gap), w: bw, h: bh };

      const candidateSlots: CandidateSlot[] = [
        {
          name: 'above',
          rect: { ...candAbove, y: clampY(candAbove.y) },
          isNaturallyInside: candAbove.y >= 2 && candAbove.y + bh <= baseHeight - 2
        },
        {
          name: 'below',
          rect: { ...candBelow, y: clampY(candBelow.y) },
          isNaturallyInside: candBelow.y >= 2 && candBelow.y + bh <= baseHeight - 2
        },
        {
          name: 'top-left',
          rect: candTopLeft,
          isNaturallyInside: true
        },
        {
          name: 'top-right',
          rect: candTopRight,
          isNaturallyInside: true
        },
        {
          name: 'bottom-left',
          rect: candBottomLeft,
          isNaturallyInside: true
        },
        {
          name: 'bottom-right',
          rect: candBottomRight,
          isNaturallyInside: true
        }
      ];

      // Try positions in specified order: 1. Above, 2. Below, 3. Top-left, 4. Top-right, 5. Bottom-left, 6. Bottom-right
      let chosenSlot: CandidateSlot | null = null;

      for (const slot of candidateSlots) {
        // If slot 1 (above) or slot 2 (below) falls outside viewport, don't use as free position
        if (!slot.isNaturallyInside) continue;

        let hasCollision = false;
        for (const placed of placedLabels) {
          if (rectsCollide(slot.rect, placed, gap)) {
            hasCollision = true;
            break;
          }
        }

        if (!hasCollision) {
          chosenSlot = slot;
          break;
        }
      }

      // If all positions collide, pick the position with the minimum total overlap
      if (!chosenSlot) {
        let minOverlapScore = Infinity;
        let bestSlot = candidateSlots[0];

        for (const slot of candidateSlots) {
          let totalOverlap = 0;
          for (const placed of placedLabels) {
            totalOverlap += overlapArea(slot.rect, placed);
          }
          // Slight penalty if position had to be clamped across edges
          if (!slot.isNaturallyInside) {
            totalOverlap += 500;
          }
          if (totalOverlap < minOverlapScore) {
            minOverlapScore = totalOverlap;
            bestSlot = slot;
          }
        }
        chosenSlot = bestSlot;
      }

      item.badgeX = chosenSlot.rect.x;
      item.badgeY = chosenSlot.rect.y;
      placedLabels.push(chosenSlot.rect);
    }

    return preparedItems;
  }, [detections, minConfidence, filterCategory, baseWidth, baseHeight, showConfidence]);

  // Map of vehicle ID -> associated plate item for fast lookup
  const vehicleToPlateMap = useMemo(() => {
    const map = new Map<string, PreparedItem>();
    for (const item of renderedDetections) {
      if (item.isPlate && item.parentVehicleId) {
        map.set(item.parentVehicleId, item);
      }
    }
    return map;
  }, [renderedDetections]);

  // Map of plate ID -> parent vehicle item
  const plateToVehicleMap = useMemo(() => {
    const map = new Map<string, PreparedItem>();
    const vehMap = new Map<string, PreparedItem>();
    for (const item of renderedDetections) {
      if (item.isVehicle) {
        vehMap.set(item.id, item);
      }
    }
    for (const item of renderedDetections) {
      if (item.isPlate && item.parentVehicleId) {
        const v = vehMap.get(item.parentVehicleId);
        if (v) map.set(item.id, v);
      }
    }
    return map;
  }, [renderedDetections]);

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
        <filter id="svg-glow-yellow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Diagonal Tech Scanlines Pattern */}
        <pattern id="svg-tech-stripes" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="16" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
        </pattern>
      </defs>

      {/* RENDER VEHICLE ↔ PLATE ASSOCIATION CONNECTOR (Requirement 4 & 13) */}
      {renderedDetections.map((item, index) => {
        if (!item.isVehicle) return null;
        const associatedPlate = vehicleToPlateMap.get(item.id);
        if (!associatedPlate) return null;

        const isHovered = hoveredIdx === index || renderedDetections.findIndex(d => d.id === associatedPlate.id) === hoveredIdx;
        const isSelected = selectedDetectionId === item.id || selectedDetectionId === associatedPlate.id;

        // Draw association link between Vehicle and Plate
        const vCenterX = (item.x1 + item.x2) / 2;
        const vBumperY = item.y2;
        const pCenterX = (associatedPlate.x1 + associatedPlate.x2) / 2;
        const pCenterY = associatedPlate.y1;

        return (
          <g key={`assoc-${item.id}-${associatedPlate.id}`} pointerEvents="none" opacity={isHovered || isSelected ? 1 : 0.65}>
            {/* Tech dashed line linking vehicle bumper to plate */}
            <line
              x1={vCenterX}
              y1={vBumperY}
              x2={pCenterX}
              y2={pCenterY}
              stroke="#34C759"
              strokeWidth={isHovered || isSelected ? 1.8 : 1}
              strokeDasharray="3 3"
            />
            {/* Visual small node at vehicle anchor */}
            <circle cx={vCenterX} cy={vBumperY} r={isHovered || isSelected ? 3 : 2} fill="#00C2FF" />
            {/* Visual small node at plate anchor */}
            <circle cx={pCenterX} cy={pCenterY} r={isHovered || isSelected ? 3 : 2} fill="#34C759" />
          </g>
        );
      })}

      {/* RENDER DETECTIONS */}
      {renderedDetections.map((item, index) => {
        const { det, id, x1, y1, x2, y2, boxW, boxH, style, labelText, confPercent, badgeWidth, badgeHeight, badgeX, badgeY, isVehicle, isPlate } = item;
        const isHovered = hoveredIdx === index;
        const isSelected = selectedDetectionId === id || selectedDetectionId === (det.id || `det-${index}`);

        // Corner bracket size
        const bracketLen = Math.min(16, Math.max(6, Math.floor(Math.min(boxW, boxH) * 0.22)));
        const strokeWidth = isSelected || isHovered ? 2.5 : isPlate ? 1.5 : 2;

        const associatedPlate = isVehicle ? vehicleToPlateMap.get(id) : null;
        const parentVehicle = isPlate ? plateToVehicleMap.get(id) : null;

        return (
          <g
            key={`${id}-${index}-${Math.round(x1)}-${Math.round(y1)}`}
            id={`svg-det-group-${index}`}
            className="pointer-events-auto cursor-pointer transition-all duration-150"
            onMouseEnter={() => setHoveredIdx(index)}
            onMouseLeave={() => setHoveredIdx(null)}
            onClick={() => onSelectDetection && onSelectDetection(det)}
          >
            {/* 1. Bounding Box Semi-transparent Fill */}
            {showFill && (
              <rect
                x={x1}
                y={y1}
                width={boxW}
                height={boxH}
                fill={isHovered || isSelected ? style.stroke : style.fill}
                fillOpacity={isHovered || isSelected ? 0.22 : 0.10}
                className="transition-all duration-150"
              />
            )}

            {/* Pattern Stripe Overlay on Hover */}
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
              <g stroke={style.stroke} strokeWidth={strokeWidth + 0.8} fill="none" strokeLinecap="square">
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
              <g stroke={style.stroke} strokeWidth="1" strokeOpacity="0.75" fill="none">
                <line x1={x1 + boxW / 2 - 6} y1={y1 + boxH / 2} x2={x1 + boxW / 2 + 6} y2={y1 + boxH / 2} />
                <line x1={x1 + boxW / 2} y1={y1 + boxH / 2 - 6} x2={x1 + boxW / 2} y2={y1 + boxH / 2 + 6} />
                <circle cx={x1 + boxW / 2} cy={y1 + boxH / 2} r="3" stroke={style.stroke} strokeWidth="1" />
              </g>
            )}

            {/* 5. Compact Header Label Badge (Collision-Aware, Guaranteed Inside Viewport) */}
            {showLabels && (
              <g transform={`translate(${badgeX}, ${badgeY})`}>
                {/* Badge Background */}
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

                {/* Micro Confidence Indicator line under Badge */}
                {showConfidence && (
                  <rect
                    x="0"
                    y={badgeHeight - 2}
                    width={(badgeWidth * confPercent) / 100}
                    height="2"
                    fill="#FFFFFF"
                    fillOpacity="0.9"
                  />
                )}

                {/* Badge Text */}
                <text
                  x="5"
                  y={badgeHeight - 5.5}
                  fill={style.textColor}
                  fontSize="9.5"
                  fontWeight="bold"
                  fontFamily="monospace"
                  letterSpacing="0.3px"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.85)' }}
                >
                  {labelText}
                </text>
              </g>
            )}

            {/* 6. Vehicle ↔ Plate Hierarchy Tag on Hover / Selected */}
            {(isHovered || isSelected) && associatedPlate && (
              <g transform={`translate(${badgeX}, ${badgeY + badgeHeight + 2})`}>
                <rect
                  x="0"
                  y="0"
                  width={Math.max(90, (associatedPlate.plateNumber ? `↳ Plate: ${associatedPlate.plateNumber}` : '↳ Linked Plate').length * 6 + 10)}
                  height="14"
                  rx="2"
                  fill="#111827"
                  stroke="#34C759"
                  strokeWidth="0.8"
                />
                <text
                  x="4"
                  y="10.5"
                  fill="#34C759"
                  fontSize="8.5"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {associatedPlate.plateNumber ? `↳ Plate: ${associatedPlate.plateNumber}` : '↳ Linked Plate'}
                </text>
              </g>
            )}

            {(isHovered || isSelected) && parentVehicle && (
              <g transform={`translate(${badgeX}, ${badgeY + badgeHeight + 2})`}>
                <rect
                  x="0"
                  y="0"
                  width={75}
                  height="14"
                  rx="2"
                  fill="#111827"
                  stroke="#00C2FF"
                  strokeWidth="0.8"
                />
                <text
                  x="4"
                  y="10.5"
                  fill="#00C2FF"
                  fontSize="8.5"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  ↳ On Vehicle
                </text>
              </g>
            )}

            {/* 7. Severity / Critical Tag (Top-Right of Box) */}
            {showSeverity && det.severity && det.severity.toUpperCase() === 'CRITICAL' && (
              <g transform={`translate(${Math.max(x1 + 10, x2 - 46)}, ${Math.max(2, y1 + 3)})`}>
                <rect
                  x="0"
                  y="0"
                  width="42"
                  height="13"
                  rx="2"
                  fill="#FF3B30"
                  stroke="#FFFFFF"
                  strokeWidth="0.5"
                />
                <text
                  x="21"
                  y="9.5"
                  fill="#FFFFFF"
                  fontSize="7.5"
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
