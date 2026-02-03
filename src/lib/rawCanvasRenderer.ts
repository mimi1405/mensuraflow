import { Viewport } from '../types';

export function renderDXFRawEntities(
  ctx: CanvasRenderingContext2D,
  rawEntities: any[],
  viewport: Viewport
) {
  const lineWidth = 1.5 / viewport.scale;
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = '#000000';
  ctx.fillStyle = '#000000';

  for (const entity of rawEntities) {
    try {
      renderRawEntity(ctx, entity, viewport);
    } catch (error) {
      console.warn(`Failed to render entity type ${entity.type}:`, error);
    }
  }
}

function renderRawEntity(
  ctx: CanvasRenderingContext2D,
  entity: any,
  viewport: Viewport
) {
  const type = entity.type?.toUpperCase();

  switch (type) {
    case 'LINE':
      renderLine(ctx, entity);
      break;
    case 'LWPOLYLINE':
    case 'POLYLINE':
      renderPolyline(ctx, entity);
      break;
    case 'ARC':
      renderArc(ctx, entity);
      break;
    case 'CIRCLE':
      renderCircle(ctx, entity);
      break;
    case 'TEXT':
    case 'MTEXT':
      renderText(ctx, entity, viewport);
      break;
    case 'SPLINE':
      renderSpline(ctx, entity);
      break;
    case 'ELLIPSE':
      renderEllipse(ctx, entity);
      break;
    default:
      break;
  }
}

function renderLine(ctx: CanvasRenderingContext2D, entity: any) {
  if (!entity.vertices || entity.vertices.length < 2) return;

  const start = entity.vertices[0];
  const end = entity.vertices[1];

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
}

function renderPolyline(ctx: CanvasRenderingContext2D, entity: any) {
  if (!entity.vertices || entity.vertices.length < 2) return;

  ctx.beginPath();
  const first = entity.vertices[0];
  ctx.moveTo(first.x, first.y);

  for (let i = 1; i < entity.vertices.length; i++) {
    const vertex = entity.vertices[i];
    const prevVertex = entity.vertices[i - 1];

    if (prevVertex.bulge && prevVertex.bulge !== 0) {
      const bulge = prevVertex.bulge;
      const angle = 4 * Math.atan(bulge);
      const dx = vertex.x - prevVertex.x;
      const dy = vertex.y - prevVertex.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const radius = distance * (1 + bulge * bulge) / (4 * Math.abs(bulge));

      const midX = (prevVertex.x + vertex.x) / 2;
      const midY = (prevVertex.y + vertex.y) / 2;
      const perpX = -dy / distance;
      const perpY = dx / distance;
      const sagitta = radius - distance / (2 * Math.abs(bulge));
      const sign = bulge > 0 ? 1 : -1;
      const centerX = midX + sign * sagitta * perpX;
      const centerY = midY + sign * sagitta * perpY;

      const startAngle = Math.atan2(prevVertex.y - centerY, prevVertex.x - centerX);
      const endAngle = Math.atan2(vertex.y - centerY, vertex.x - centerX);

      ctx.arc(centerX, centerY, radius, startAngle, endAngle, bulge < 0);
    } else {
      ctx.lineTo(vertex.x, vertex.y);
    }
  }

  if (entity.shape) {
    ctx.closePath();
  }

  ctx.stroke();
}

function renderArc(ctx: CanvasRenderingContext2D, entity: any) {
  if (!entity.center || entity.radius === undefined) return;

  const startAngle = (entity.startAngle || 0) * Math.PI / 180;
  const endAngle = (entity.endAngle || 360) * Math.PI / 180;

  ctx.beginPath();
  ctx.arc(entity.center.x, entity.center.y, entity.radius, startAngle, endAngle, false);
  ctx.stroke();
}

function renderCircle(ctx: CanvasRenderingContext2D, entity: any) {
  if (!entity.center || entity.radius === undefined) return;

  ctx.beginPath();
  ctx.arc(entity.center.x, entity.center.y, entity.radius, 0, 2 * Math.PI);
  ctx.stroke();
}

function renderText(ctx: CanvasRenderingContext2D, entity: any, viewport: Viewport) {
  if (!entity.startPoint || !entity.text) return;

  const x = entity.startPoint.x;
  const y = entity.startPoint.y;
  const text = entity.text;
  const height = entity.textHeight || entity.height || 2.5;

  ctx.save();

  ctx.scale(1, -1);

  const fontSize = Math.max(height * viewport.scale, 8);
  ctx.font = `${fontSize}px Arial`;
  ctx.fillStyle = '#333333';
  ctx.textBaseline = 'bottom';

  const rotation = (entity.rotation || 0) * Math.PI / 180;
  if (rotation !== 0) {
    ctx.translate(x, -y);
    ctx.rotate(-rotation);
    ctx.fillText(text, 0, 0);
  } else {
    ctx.fillText(text, x, -y);
  }

  ctx.restore();
}

function renderSpline(ctx: CanvasRenderingContext2D, entity: any) {
  if (!entity.controlPoints || entity.controlPoints.length < 2) return;

  ctx.beginPath();
  const first = entity.controlPoints[0];
  ctx.moveTo(first.x, first.y);

  if (entity.controlPoints.length === 2) {
    const second = entity.controlPoints[1];
    ctx.lineTo(second.x, second.y);
  } else if (entity.controlPoints.length === 3) {
    const [p1, p2, p3] = entity.controlPoints;
    ctx.quadraticCurveTo(p2.x, p2.y, p3.x, p3.y);
  } else if (entity.controlPoints.length >= 4) {
    for (let i = 1; i < entity.controlPoints.length - 2; i += 3) {
      const cp1 = entity.controlPoints[i];
      const cp2 = entity.controlPoints[i + 1];
      const end = entity.controlPoints[i + 2];
      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y);
    }
  }

  ctx.stroke();
}

function renderEllipse(ctx: CanvasRenderingContext2D, entity: any) {
  if (!entity.center || !entity.majorAxisEndPoint) return;

  const cx = entity.center.x;
  const cy = entity.center.y;
  const majorX = entity.majorAxisEndPoint.x;
  const majorY = entity.majorAxisEndPoint.y;
  const radiusRatio = entity.axisRatio || 1;

  const majorRadius = Math.sqrt(majorX * majorX + majorY * majorY);
  const minorRadius = majorRadius * radiusRatio;
  const rotation = Math.atan2(majorY, majorX);

  const startAngle = entity.startAngle || 0;
  const endAngle = entity.endAngle || 2 * Math.PI;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.scale(1, radiusRatio);

  ctx.beginPath();
  ctx.arc(0, 0, majorRadius, startAngle, endAngle, false);
  ctx.restore();
  ctx.stroke();
}

export function isEntityInPaperSpace(entity: any): boolean {
  return entity.inPaperSpace === true || entity.ownerHandle === '1F';
}
