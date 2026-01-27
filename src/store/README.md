# Store Architecture

The application store is organized into logical slices for better maintainability and code organization.

## File Structure

```
store/
├── README.md              # This file - documentation
├── storeTypes.ts          # Central type definitions
├── appStore.ts            # Main store router (combines all slices)
├── projectSlice.ts        # Project & plan management
├── measurementSlice.ts    # Measurement operations
├── toolSlice.ts           # Tool state & interactions
├── bodenSlice.ts          # Boden (floor) mode workflow
└── cutoutSlice.ts         # Cutout creation & management
```

## Module Responsibilities

### `storeTypes.ts`
**Purpose**: Central type definitions for the entire store

Contains:
- `AppState` interface - Complete store shape including all state and actions
- Used by all slice files for type safety

### `appStore.ts`
**Purpose**: Main store router that combines all slices

- Combines state and actions from all feature slices
- Maintains backward compatibility with existing code
- Acts as the single import point: `import { useAppStore } from './store/appStore'`

### `projectSlice.ts`
**Purpose**: Project and plan management

Manages:
- Current project selection
- Current plan selection
- List of all plans in the current project

Actions:
- `setCurrentProject()`
- `setCurrentPlan()`
- `setPlans()`

### `measurementSlice.ts`
**Purpose**: Measurement and subcomponent management

Manages:
- All measurements in the current plan
- Measurement subcomponents (windows, doors, openings)
- Section parameters for measurements

Actions:
- `setMeasurements()`
- `setSubcomponents()`
- `setSectionParameters()`

### `toolSlice.ts`
**Purpose**: Tool state and user interactions

Manages:
- Active tool selection (select, area, line, window, door, etc.)
- Drawing points for current operation
- Selected and hovered measurements/cutouts
- Pending line type configuration

Actions:
- `setActiveTool()`
- `setCurrentPoints()`, `addCurrentPoint()`, `removeLastPoint()`, `clearCurrentPoints()`
- `setSelectedMeasurement()`, `setSelectedCutout()`
- `setHoveredMeasurement()`
- `setPendingLineType()`

### `bodenSlice.ts`
**Purpose**: Boden (floor) feature workflow

Manages:
- Enabling/disabling Boden mode
- Multi-step floor creation process (ceiling → rooms → finish)
- Room selection and floor kind configuration
- Intent arming/disarming for drawing operations

Actions:
- `enableBodenMode()`, `disableBodenMode()`, `resetBodenMode()`
- `setBodenPanelOpen()`
- `armBodenIntent()`, `disarmBodenIntent()`
- `advanceBodenToRooms()`
- `setBodenFloorKind()`
- `setBodenSelectedRoom()`

### `cutoutSlice.ts`
**Purpose**: Cutout workflow and operations

Manages:
- Cutout creation flow (shape selection → drawing → scope selection → apply)
- Draft cutout state during creation
- Applying cutouts to target measurements with area recalculation
- Assignment and removal of cutouts from measurements

Actions:
- `setCutouts()`, `addCutout()`, `removeCutout()`
- `assignCutoutToMeasurements()`, `unassignCutoutFromMeasurement()`
- `startCutoutFromMeasurement()`, `selectCutoutShape()`, `finishCutoutDrawing()`
- `setCutoutScopeSelection()`, `applyCutoutToTargets()`
- `cancelCutoutFlow()`

## Usage

Import and use the store as before:

```typescript
import { useAppStore } from './store/appStore';

function MyComponent() {
  const { currentProject, setCurrentProject } = useAppStore();
  // ... component code
}
```

The refactoring maintains 100% backward compatibility - no changes needed in consuming components.

## Benefits

1. **Better Organization**: Related functionality grouped into logical modules
2. **Easier Maintenance**: Each slice is focused on a single responsibility
3. **Improved Readability**: Smaller files are easier to understand
4. **Type Safety**: Centralized types ensure consistency
5. **Testability**: Individual slices can be tested independently
6. **Scalability**: New features can be added as new slices

## Adding New Features

To add a new feature slice:

1. Create a new slice file (e.g., `myFeatureSlice.ts`)
2. Define the slice interface and implementation
3. Add types to `storeTypes.ts`
4. Import and merge in `appStore.ts`

Example:

```typescript
// myFeatureSlice.ts
export interface MyFeatureSlice {
  myState: string;
  myAction: () => void;
}

export const createMyFeatureSlice: StateCreator<AppState, [], [], MyFeatureSlice> = (set) => ({
  myState: 'initial',
  myAction: () => set({ myState: 'updated' }),
});
```

```typescript
// appStore.ts
import { createMyFeatureSlice } from './myFeatureSlice';

export const useAppStore = create<AppState>()((...a) => ({
  ...createProjectSlice(...a),
  ...createMyFeatureSlice(...a),
  // ... other slices
}));
```
