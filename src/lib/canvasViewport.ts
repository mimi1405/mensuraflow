/**
 * Viewport Management Utilities
 *
 * This module handles:
 * - Automatic viewport fitting to show entire DXF content
 * - Coordinate transformations between screen and world space
 * - Smart zooming to focus on main building areas using density analysis
 */

import { Point, DXFEntity } from '../types';

export interface Viewport {
  offsetX: number;
  offsetY: number;
  scale: number;
}

/**
 * Converts screen coordinates to world coordinates based on current viewport
 */
export const screenToWorld = (
  screenX: number,
  screenY: number,
  canvas: HTMLCanvasElement | null,
  viewport: Viewport
): Point => {
  if (!canvas) return { x: 0, y: 0 };

  const rect = canvas.getBoundingClientRect();
  const x = screenX - rect.left;
  const y = screenY - rect.top;

  const worldX = (x - viewport.offsetX) / viewport.scale;
  const worldY = -(y - viewport.offsetY) / viewport.scale;

  return { x: worldX, y: worldY };
};

/**
 * Automatically fits the viewport to show the main content of the DXF file
 * Uses density analysis to focus on the primary building structure
 */
export const autoFitView = (
  entities: DXFEntity[],
  canvas: HTMLCanvasElement
): Viewport => {
  if (!entities || entities.length === 0) {
    return { offsetX: 0, offsetY: 0, scale: 1 };
  }

  let globalMinX = Infinity;
  let globalMinY = Infinity;
  let globalMaxX = -Infinity;
  let globalMaxY = -Infinity;

  const relevantEntities: DXFEntity[] = [];

  for (const entity of entities) {
    if (entity.type === 'text' || entity.type === 'mtext') continue;

    if (entity.type === 'line' && entity.start && entity.end) {
      const lineLength = Math.sqrt(
        Math.pow(entity.end.x - entity.start.x, 2) +
        Math.pow(entity.end.y - entity.start.y, 2)
      );

      if (lineLength > 0) {
        relevantEntities.push(entity);
        globalMinX = Math.min(globalMinX, entity.start.x, entity.end.x);
        globalMinY = Math.min(globalMinY, entity.start.y, entity.end.y);
        globalMaxX = Math.max(globalMaxX, entity.start.x, entity.end.x);
        globalMaxY = Math.max(globalMaxY, entity.start.y, entity.end.y);
      }
    } else if ((entity.type === 'polyline' || entity.type === 'lwpolyline') && entity.points) {
      if (entity.points.length >= 2) {
        relevantEntities.push(entity);
        for (const point of entity.points) {
          globalMinX = Math.min(globalMinX, point.x);
          globalMinY = Math.min(globalMinY, point.y);
          globalMaxX = Math.max(globalMaxX, point.x);
          globalMaxY = Math.max(globalMaxY, point.y);
        }
      }
    }
  }

  if (relevantEntities.length === 0 || globalMinX === Infinity) {
    return { offsetX: 0, offsetY: 0, scale: 1 };
  }

  const gridSize = 30;
  const dxfWidth = globalMaxX - globalMinX;
  const dxfHeight = globalMaxY - globalMinY;
  const cellWidth = dxfWidth / gridSize;
  const cellHeight = dxfHeight / gridSize;

  const densityGrid: number[][] = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));

  for (const entity of relevantEntities) {
    if (entity.type === 'line' && entity.start && entity.end) {
      const lineLength = Math.sqrt(
        Math.pow(entity.end.x - entity.start.x, 2) +
        Math.pow(entity.end.y - entity.start.y, 2)
      );

      if (lineLength < dxfWidth * 0.5 && lineLength < dxfHeight * 0.5) {
        const cellX = Math.floor((entity.start.x - globalMinX) / cellWidth);
        const cellY = Math.floor((entity.start.y - globalMinY) / cellHeight);
        const cellXEnd = Math.floor((entity.end.x - globalMinX) / cellWidth);
        const cellYEnd = Math.floor((entity.end.y - globalMinY) / cellHeight);

        const validCellX = Math.max(0, Math.min(gridSize - 1, cellX));
        const validCellY = Math.max(0, Math.min(gridSize - 1, cellY));
        const validCellXEnd = Math.max(0, Math.min(gridSize - 1, cellXEnd));
        const validCellYEnd = Math.max(0, Math.min(gridSize - 1, cellYEnd));

        densityGrid[validCellY][validCellX] += lineLength;
        if (validCellX !== validCellXEnd || validCellY !== validCellYEnd) {
          densityGrid[validCellYEnd][validCellXEnd] += lineLength;
        }
      }
    } else if ((entity.type === 'polyline' || entity.type === 'lwpolyline') && entity.points) {
      for (let i = 0; i < entity.points.length - 1; i++) {
        const p1 = entity.points[i];
        const p2 = entity.points[i + 1];
        const segmentLength = Math.sqrt(
          Math.pow(p2.x - p1.x, 2) +
          Math.pow(p2.y - p1.y, 2)
        );

        const cellX = Math.floor((p1.x - globalMinX) / cellWidth);
        const cellY = Math.floor((p1.y - globalMinY) / cellHeight);

        const validCellX = Math.max(0, Math.min(gridSize - 1, cellX));
        const validCellY = Math.max(0, Math.min(gridSize - 1, cellY));

        densityGrid[validCellY][validCellX] += segmentLength;
      }
    }
  }

  let maxDensity = 0;
  let centerCellX = Math.floor(gridSize / 2);
  let centerCellY = Math.floor(gridSize / 2);

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (densityGrid[y][x] > maxDensity) {
        maxDensity = densityGrid[y][x];
        centerCellX = x;
        centerCellY = y;
      }
    }
  }

  const searchRadius = 5;
  let buildingMinX = Infinity;
  let buildingMinY = Infinity;
  let buildingMaxX = -Infinity;
  let buildingMaxY = -Infinity;

  for (let y = Math.max(0, centerCellY - searchRadius); y < Math.min(gridSize, centerCellY + searchRadius + 1); y++) {
    for (let x = Math.max(0, centerCellX - searchRadius); x < Math.min(gridSize, centerCellX + searchRadius + 1); x++) {
      if (densityGrid[y][x] > maxDensity * 0.1) {
        const cellMinX = globalMinX + x * cellWidth;
        const cellMinY = globalMinY + y * cellHeight;
        const cellMaxX = cellMinX + cellWidth;
        const cellMaxY = cellMinY + cellHeight;

        buildingMinX = Math.min(buildingMinX, cellMinX);
        buildingMinY = Math.min(buildingMinY, cellMinY);
        buildingMaxX = Math.max(buildingMaxX, cellMaxX);
        buildingMaxY = Math.max(buildingMaxY, cellMaxY);
      }
    }
  }

  if (buildingMinX === Infinity) {
    buildingMinX = globalMinX;
    buildingMinY = globalMinY;
    buildingMaxX = globalMaxX;
    buildingMaxY = globalMaxY;
  }

  const padding = 0.15;
  const buildingWidth = (buildingMaxX - buildingMinX) * (1 + padding * 2);
  const buildingHeight = (buildingMaxY - buildingMinY) * (1 + padding * 2);
  const buildingCenterX = (buildingMinX + buildingMaxX) / 2;
  const buildingCenterY = (buildingMinY + buildingMaxY) / 2;

  const scaleX = canvas.width / buildingWidth;
  const scaleY = canvas.height / buildingHeight;
  const scale = Math.min(scaleX, scaleY);

  const offsetX = canvas.width / 2 - buildingCenterX * scale;
  const offsetY = canvas.height / 2 + buildingCenterY * scale;

  return { offsetX, offsetY, scale };
};
