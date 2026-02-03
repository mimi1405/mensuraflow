import DxfParser from 'dxf-parser';
import { DXFData, DXFEntity, Point, BoundingBox } from '../types';

interface Transform {
  tx: number;
  ty: number;
  rotation: number;
  sx: number;
  sy: number;
}

interface ParsedEntities {
  model: DXFEntity[];
  paper: DXFEntity[];
  modelPoints: Point[];
  paperPoints: Point[];
}

const MAX_RECURSION_DEPTH = 10;

export async function parseDXFFile(file: File): Promise<DXFData> {
  const text = await file.text();
  const parser = new DxfParser();

  try {
    const dxf = parser.parseSync(text);

    let rawEntityCount = 0;
    let insertsExploded = 0;

    const parsed = flattenEntities(dxf, { count: insertsExploded });
    insertsExploded = parsed.insertsExploded;
    rawEntityCount = dxf.entities ? dxf.entities.length : 0;

    const boundingBoxModel = calculateBoundingBox(parsed.modelPoints);
    const boundingBoxPaper = calculateBoundingBox(parsed.paperPoints);
    const units = detectDXFUnits(dxf);

    console.log('DXF Parse Statistics:', {
      rawEntities: rawEntityCount,
      flattenedModel: parsed.model.length,
      flattenedPaper: parsed.paper.length,
      insertsExploded,
    });

    return {
      entities: parsed.model, // Backwards compatibility
      entitiesModel: parsed.model,
      entitiesPaper: parsed.paper,
      boundingBox: boundingBoxModel, // Backwards compatibility
      boundingBoxModel,
      boundingBoxPaper,
      units,
      raw: {
        entities: dxf.entities || [],
        header: dxf.header,
        blocks: dxf.blocks,
        tables: dxf.tables,
      },
      stats: {
        rawEntities: rawEntityCount,
        flattenedEntities: parsed.model.length + parsed.paper.length,
        insertsExploded,
        paperSpaceEntities: parsed.paper.length,
      },
    };
  } catch (error) {
    console.error('DXF parsing error:', error);
    throw new Error('Failed to parse DXF file. Please ensure the file is a valid DXF format.');
  }
}

function flattenEntities(dxf: any, stats: { count: number }): ParsedEntities & { insertsExploded: number } {
  const result: ParsedEntities = {
    model: [],
    paper: [],
    modelPoints: [],
    paperPoints: [],
  };

  if (!dxf.entities) {
    return { ...result, insertsExploded: stats.count };
  }

  for (const entity of dxf.entities) {
    const isPaperSpace = isEntityInPaperSpace(entity);
    const space = isPaperSpace ? 'paper' : 'model';

    if (entity.type === 'INSERT') {
      stats.count++;
      const exploded = explodeInsert(entity, dxf, createIdentityTransform(), space, 0);
      if (space === 'paper') {
        result.paper.push(...exploded.entities);
        result.paperPoints.push(...exploded.points);
      } else {
        result.model.push(...exploded.entities);
        result.modelPoints.push(...exploded.points);
      }
    } else {
      const parsed = parseEntity(entity, createIdentityTransform());
      if (parsed) {
        if (space === 'paper') {
          result.paper.push(parsed.entity);
          result.paperPoints.push(...parsed.points);
        } else {
          result.model.push(parsed.entity);
          result.modelPoints.push(...parsed.points);
        }
      }
    }
  }

  return { ...result, insertsExploded: stats.count };
}

function isEntityInPaperSpace(entity: any): boolean {
  if (entity.inPaperSpace === true) return true;
  if (entity.paperSpace === true) return true;
  if (entity.ownerHandle) {
    const handle = entity.ownerHandle.toString().toUpperCase();
    if (handle.includes('PAPER')) return true;
  }
  return false;
}

function createIdentityTransform(): Transform {
  return { tx: 0, ty: 0, rotation: 0, sx: 1, sy: 1 };
}

function explodeInsert(
  entity: any,
  dxf: any,
  parentTransform: Transform,
  space: 'model' | 'paper',
  depth: number
): { entities: DXFEntity[]; points: Point[] } {
  if (depth > MAX_RECURSION_DEPTH) {
    console.warn('Max recursion depth reached for INSERT blocks');
    return { entities: [], points: [] };
  }

  if (!entity.name || !dxf.blocks) {
    return { entities: [], points: [] };
  }

  const blockName = entity.name;
  const block = dxf.blocks[blockName];

  if (!block || !block.entities) {
    return { entities: [], points: [] };
  }

  const insertTransform = createTransformFromInsert(entity, parentTransform);
  const result: { entities: DXFEntity[]; points: Point[] } = { entities: [], points: [] };

  for (const blockEntity of block.entities) {
    if (blockEntity.type === 'INSERT') {
      const nested = explodeInsert(blockEntity, dxf, insertTransform, space, depth + 1);
      result.entities.push(...nested.entities);
      result.points.push(...nested.points);
    } else {
      const parsed = parseEntity(blockEntity, insertTransform);
      if (parsed) {
        result.entities.push(parsed.entity);
        result.points.push(...parsed.points);
      }
    }
  }

  return result;
}

function createTransformFromInsert(entity: any, parentTransform: Transform): Transform {
  const position = entity.position || { x: 0, y: 0 };
  const rotation = entity.rotation || 0;
  const xScale = entity.xScale || 1;
  const yScale = entity.yScale || 1;

  const rotationRad = (rotation * Math.PI) / 180;
  const parentRotRad = (parentTransform.rotation * Math.PI) / 180;

  const cosP = Math.cos(parentRotRad);
  const sinP = Math.sin(parentRotRad);
  const scaledX = position.x * parentTransform.sx;
  const scaledY = position.y * parentTransform.sy;
  const tx = parentTransform.tx + scaledX * cosP - scaledY * sinP;
  const ty = parentTransform.ty + scaledX * sinP + scaledY * cosP;

  return {
    tx,
    ty,
    rotation: parentTransform.rotation + rotation,
    sx: parentTransform.sx * xScale,
    sy: parentTransform.sy * yScale,
  };
}

function applyTransform(point: Point, transform: Transform): Point {
  const rotRad = (transform.rotation * Math.PI) / 180;
  const cos = Math.cos(rotRad);
  const sin = Math.sin(rotRad);

  const scaledX = point.x * transform.sx;
  const scaledY = point.y * transform.sy;

  const rotatedX = scaledX * cos - scaledY * sin;
  const rotatedY = scaledX * sin + scaledY * cos;

  return {
    x: rotatedX + transform.tx,
    y: rotatedY + transform.ty,
  };
}

function parseEntity(entity: any, transform: Transform): { entity: DXFEntity; points: Point[] } | null {
  const layer = entity.layer || '0';

  if (entity.type === 'LINE') {
    let start: Point;
    let end: Point;

    if (entity.start && entity.end) {
      start = applyTransform({ x: entity.start.x, y: entity.start.y }, transform);
      end = applyTransform({ x: entity.end.x, y: entity.end.y }, transform);
    } else if (entity.vertices && entity.vertices.length >= 2) {
      start = applyTransform({ x: entity.vertices[0].x, y: entity.vertices[0].y }, transform);
      end = applyTransform({ x: entity.vertices[1].x, y: entity.vertices[1].y }, transform);
    } else {
      return null;
    }

    return {
      entity: { type: 'line', layer, start, end },
      points: [start, end],
    };
  }

  if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
    if (!entity.vertices || entity.vertices.length === 0) return null;

    const points = entity.vertices.map((v: any) =>
      applyTransform({ x: v.x, y: v.y }, transform)
    );

    return {
      entity: { type: 'lwpolyline', layer, points },
      points,
    };
  }

  if (entity.type === 'ARC') {
    if (!entity.center) return null;

    const center = applyTransform({ x: entity.center.x, y: entity.center.y }, transform);
    const radius = entity.radius * Math.abs(transform.sx);
    const startAngle = entity.startAngle + transform.rotation;
    const endAngle = entity.endAngle + transform.rotation;

    const arcPoints = approximateArcPoints(center, radius, startAngle, endAngle);

    return {
      entity: { type: 'arc', layer, center, radius, startAngle, endAngle },
      points: arcPoints,
    };
  }

  if (entity.type === 'CIRCLE') {
    if (!entity.center) return null;

    const center = applyTransform({ x: entity.center.x, y: entity.center.y }, transform);
    const radius = entity.radius * Math.abs(transform.sx);

    const circlePoints = approximateCirclePoints(center, radius);

    return {
      entity: { type: 'circle', layer, center, radius },
      points: circlePoints,
    };
  }

  return null;
}

function approximateArcPoints(center: Point, radius: number, startAngle: number, endAngle: number): Point[] {
  const points: Point[] = [center];
  const segments = 16;
  let angleDiff = endAngle - startAngle;

  if (angleDiff < 0) angleDiff += 2 * Math.PI;

  for (let i = 0; i <= segments; i++) {
    const angle = startAngle + (angleDiff * i) / segments;
    points.push({
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    });
  }

  return points;
}

function approximateCirclePoints(center: Point, radius: number): Point[] {
  const points: Point[] = [center];
  const segments = 32;

  for (let i = 0; i < segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    points.push({
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    });
  }

  return points;
}

function calculateBoundingBox(points: Point[]): BoundingBox {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  const width = maxX - minX;
  const height = maxY - minY;

  if (width === 0 || height === 0) {
    const defaultSize = 100;
    return {
      minX: minX - defaultSize / 2,
      minY: minY - defaultSize / 2,
      maxX: maxX + defaultSize / 2,
      maxY: maxY + defaultSize / 2,
    };
  }

  const marginPercent = 0.05;

  return {
    minX: minX - width * marginPercent,
    minY: minY - height * marginPercent,
    maxX: maxX + width * marginPercent,
    maxY: maxY + height * marginPercent,
  };
}

function detectDXFUnits(dxf: any): string {
  if (dxf.header && dxf.header.$INSUNITS) {
    const insunits = dxf.header.$INSUNITS;
    switch (insunits) {
      case 1: return 'inches';
      case 2: return 'feet';
      case 4: return 'mm';
      case 5: return 'cm';
      case 6: return 'm';
      case 14: return 'km';
      default: return 'mm';
    }
  }
  return 'mm';
}

export function calculatePolygonArea(points: Point[]): number {
  if (points.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  return Math.abs(area / 2);
}

export function calculateLineLength(start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function calculateRectangleArea(points: Point[]): number {
  if (points.length !== 2) return 0;
  const width = Math.abs(points[1].x - points[0].x);
  const height = Math.abs(points[1].y - points[0].y);
  return width * height;
}
