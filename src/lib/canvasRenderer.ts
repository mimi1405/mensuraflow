/**
 * Canvas Renderer - Main Router
 *
 * Purpose: This file serves as a centralized export point for all rendering functions.
 * The actual rendering logic has been split into focused, single-responsibility modules
 * under the renderers/ directory for better maintainability and organization.
 *
 * Module Organization:
 * - dxfEntityRenderer: Renders raw DXF entities (lines, polylines, arcs, circles)
 * - floorHatchRenderer: Renders floor layers with hatch patterns (ceiling, roomFloor, finish)
 * - measurementRenderer: Renders user measurements (areas, windows, doors, lines) with cutouts
 * - drawingPreviewRenderer: Renders real-time drawing preview as user creates shapes
 * - ghostObjectRenderer: Renders semi-transparent preview during copy/paste operations
 * - cutoutRenderer: Renders cutout shapes that subtract from measurement areas
 * - labelRenderer: Renders text labels showing names and values for all objects
 *
 * By keeping this file as a router, all existing imports throughout the application
 * continue to work without any changes.
 */

export { renderDXFEntities } from './renderers/dxfEntityRenderer';
export { renderFloorHatches } from './renderers/floorHatchRenderer';
export { renderMeasurements } from './renderers/measurementRenderer';
export { renderCurrentDrawing } from './renderers/drawingPreviewRenderer';
export { renderGhostObject } from './renderers/ghostObjectRenderer';
export { renderCutouts } from './renderers/cutoutRenderer';
export { renderObjectLabels } from './renderers/labelRenderer';
