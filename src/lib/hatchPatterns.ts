import type { Point, FloorCategory, FloorKind } from '../types';

export interface HatchStyle {
  color: string;
  opacity: number;
  lineSpacing: number;
  angle: number;
  secondAngle?: number;
}

export function getHatchStyle(
  category: FloorCategory,
  floorKind?: FloorKind,
  customColor?: string
): HatchStyle {
  switch (category) {
    case 'ceiling':
      return {
        color: '#94a3b8',
        opacity: 0.2,
        lineSpacing: 8,
        angle: 45,
      };
    case 'roomFloor':
      if (floorKind === 'unterlagsboden') {
        return {
          color: '#3b82f6',
          opacity: 0.35,
          lineSpacing: 6,
          angle: 0,
          secondAngle: 90,
        };
      } else {
        return {
          color: '#10b981',
          opacity: 0.35,
          lineSpacing: 8,
          angle: 0,
        };
      }
    case 'finish':
      return {
        color: customColor || '#f59e0b',
        opacity: 0.45,
        lineSpacing: 5,
        angle: 45,
      };
    default:
      return {
        color: '#6b7280',
        opacity: 0.25,
        lineSpacing: 8,
        angle: 45,
      };
  }
}

export function renderHatchPattern(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  style: HatchStyle
) {
  if (points.length < 3) return;

  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  const rgb = hexToRgb(style.color);

  ctx.save();

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();

  ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${style.opacity})`;
  ctx.fill();

  ctx.clip();

  ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${style.opacity * 0.7})`;
  ctx.lineWidth = 1 / ctx.getTransform().a;

  const drawHatchLines = (angle: number) => {
    const angleRad = (angle * Math.PI) / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);

    const width = maxX - minX;
    const height = maxY - minY;
    const diagonal = Math.sqrt(width * width + height * height);
    const numLines = Math.ceil(diagonal / style.lineSpacing) + 2;

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    for (let i = -numLines; i < numLines; i++) {
      const offset = i * style.lineSpacing;

      const perpX = -sin * offset;
      const perpY = cos * offset;

      const startX = centerX + perpX - cos * diagonal;
      const startY = centerY + perpY - sin * diagonal;
      const endX = centerX + perpX + cos * diagonal;
      const endY = centerY + perpY + sin * diagonal;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
  };

  drawHatchLines(style.angle);

  if (style.secondAngle !== undefined) {
    drawHatchLines(style.secondAngle);
  }

  ctx.restore();

  ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.min(1, style.opacity + 0.3)})`;
  ctx.lineWidth = 2.5 / ctx.getTransform().a;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
  ctx.stroke();
}
