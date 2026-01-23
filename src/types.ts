export type PlanType = 'ground' | 'north' | 'south' | 'east' | 'west' | 'section';

export type MeasurementObjectType = 'area' | 'line' | 'window' | 'door';

export type MeasurementSource = 'dxf' | 'manual' | 'composite';

export type SubcomponentType = 'opening' | 'sturz' | 'brüstung' | 'leibung_left' | 'leibung_right';

export type LineType = 'kantenschutz' | 'dachrandabschluss' | 'perimeterdämmung';

export type FloorCategory = 'ceiling' | 'roomFloor' | 'finish';

export type FloorKind = 'unterlagsboden' | 'ueberzugsboden';

export type Unit = 'm²' | 'm' | 'mm' | 'cm';

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface DXFEntity {
  type: 'line' | 'polyline' | 'lwpolyline' | 'arc' | 'circle';
  layer: string;
  points?: Point[];
  start?: Point;
  end?: Point;
  center?: Point;
  radius?: number;
  startAngle?: number;
  endAngle?: number;
}

export interface DXFData {
  entities: DXFEntity[]; // Alias to entitiesModel for backwards compatibility
  entitiesModel: DXFEntity[];
  entitiesPaper: DXFEntity[];
  boundingBox: BoundingBox; // Alias to boundingBoxModel
  boundingBoxModel: BoundingBox;
  boundingBoxPaper: BoundingBox;
  units: string;
  stats?: {
    rawEntities: number;
    flattenedEntities: number;
    insertsExploded: number;
    paperSpaceEntities: number;
  };
}

export interface Viewport {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface Plan {
  id: string;
  project_id: string;
  name: string;
  type: PlanType;
  floor_number: number;
  floor_name: string;
  dxf_data: DXFData;
  dxf_units: string;
  unit_scale: number;
  viewport: Viewport;
  created_at: string;
  updated_at: string;
}

export interface FinishCatalogItem {
  id: string;
  user_id: string;
  name: string;
  code?: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface Measurement {
  id: string;
  plan_id: string;
  object_type: MeasurementObjectType;
  label: string;
  category: string;
  geometry: {
    points: Point[];
    width?: number;
    height?: number;
  };
  is_positive: boolean;
  line_type?: LineType;
  floor_category?: FloorCategory;
  floor_kind?: FloorKind;
  finish_catalog_id?: string;
  parent_measurement_id?: string;
  area_m2?: number;
  perimeter_m?: number;
  width_m?: number;
  length_m?: number;
  computed_value: number;
  unit: Unit;
  source: MeasurementSource;
  created_at: string;
  updated_at: string;
}

export interface MeasurementSubcomponent {
  id: string;
  parent_measurement_id: string;
  subcomponent_type: SubcomponentType;
  computed_value: number;
  unit: Unit;
  parameters: {
    width?: number;
    height?: number;
    leibung_depth?: number;
    wall_thickness?: number;
  };
  created_at: string;
}

export interface SectionParameter {
  id: string;
  plan_id: string;
  parameter_name: string;
  parameter_value: number;
  unit: Unit;
  created_at: string;
  updated_at: string;
}

export interface BodenMode {
  enabled: boolean;
  step: 'ceiling' | 'rooms';
  geometryKind: 'polygon' | 'rectangle';
  floorKind: FloorKind;
  isArmed: boolean;
  intent: 'ceiling' | 'roomFloor' | null;
  panelOpen: boolean;
  selectedRoomId: string | null;
}

export interface ToolState {
  activeTool: 'select' | 'area' | 'rectangle' | 'line' | 'window' | 'door' | 'section_params' | 'pan' | 'boden';
  currentPoints: Point[];
  hoveredEntity: DXFEntity | null;
  selectedMeasurement: Measurement | null;
  hoveredMeasurement: Measurement | null;
  pendingLineType: LineType | null;
  bodenMode: BodenMode;
}

export interface CalculationResult {
  planId: string;
  planName: string;
  positiveAreas: number;
  abzugAreas: number;
  netArea: number;
  lines: { [type: string]: number };
  windows: number;
  doors: number;
}

export interface ExportRow {
  Project: string;
  Plan: string;
  ObjectID: string;
  ObjectLabel: string;
  ObjectType: string;
  LineType: string;
  Classification: string;
  Subcomponent: string;
  Unit: string;
  Value: number;
  Source: string;
}
