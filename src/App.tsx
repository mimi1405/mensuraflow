/**
 * App.tsx - Main Application Router
 *
 * This is the root component that orchestrates the entire application.
 * It delegates specific concerns to specialized hooks:
 * - useAuth: Authentication and user session
 * - useMeasurements: Loading and creating measurements
 * - useCopyPaste: Copy/paste functionality
 * - useBodenHandlers: Floor mode handlers
 * - useMeasurementActions: User interaction handlers
 * - useKeyboardShortcuts: Global keyboard shortcuts
 *
 * The component primarily handles:
 * - Route-level state (showing wizard, onboarding, etc.)
 * - UI layout and tab management
 * - Composing child components
 */

import { useState } from 'react';
import { useAppStore } from './store/appStore';
import { Auth } from './components/Auth';
import { ProjectSelector } from './components/ProjectSelector';
import { PlanNavigation } from './components/PlanNavigation';
import { Toolbar } from './components/Toolbar';
import { DXFCanvas } from './components/DXFCanvas';
import { PropertiesPanel } from './components/PropertiesPanel';
import { SummaryPanel } from './components/SummaryPanel';
import { Onboarding } from './components/Onboarding';
import { ProjectWizard } from './components/ProjectWizard';
import { ToolInstructions } from './components/ToolInstructions';
import { LineTypeDialog } from './components/LineTypeDialog';
import { FinishCatalog } from './components/FinishCatalog';
import { BodenFloatingPanel } from './components/BodenFloatingPanel';
import { CutoutShapeModal } from './components/CutoutShapeModal';
import { CutoutTargetModal } from './components/CutoutTargetModal';
import { LogOut } from 'lucide-react';

import { useAuth } from './hooks/useAuth';
import { useMeasurements } from './hooks/useMeasurements';
import { useCopyPaste } from './hooks/useCopyPaste';
import { useBodenHandlers } from './hooks/useBodenHandlers';
import { useMeasurementActions } from './hooks/useMeasurementActions';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function App() {
  const [showWizard, setShowWizard] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [propertiesOpen, setPropertiesOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'messungen' | 'zusammenfassung' | 'einstellungen'>('messungen');

  const {
    currentProject,
    currentPlan,
    toolState,
    measurements,
    cutoutDraft,
    cutoutModalStep,
    removeLastPoint,
    clearCurrentPoints,
    startCutoutFromMeasurement,
    selectCutoutShape,
    finishCutoutDrawing,
    applyCutoutToTargets,
    cancelCutoutFlow
  } = useAppStore();

  const { user, loading, hasProjects, setHasProjects, handleLogout } = useAuth();

  const { loadMeasurements, completeMeasurement } = useMeasurements();

  const {
    copiedMeasurement,
    isPlacingCopy,
    placementPosition,
    handleCopyMeasurement,
    handlePasteMeasurement,
    handleCursorMove,
    handlePlaceCopy,
    cancelPlacing
  } = useCopyPaste(loadMeasurements);

  const { handleApplyFinish, handleRemoveFinish } = useBodenHandlers(loadMeasurements);

  const {
    showLineTypeDialog,
    handlePointClick,
    handleLineTypeSelect,
    handleLineTypeCancel,
    handleDeleteMeasurement
  } = useMeasurementActions(completeMeasurement, loadMeasurements);

  useKeyboardShortcuts({
    activeTool: toolState.activeTool,
    currentPoints: toolState.currentPoints,
    selectedMeasurement: toolState.selectedMeasurement,
    copiedMeasurement,
    isPlacingCopy,
    cutoutModalStep,
    onCompleteMeasurement: completeMeasurement,
    onFinishCutoutDrawing: finishCutoutDrawing,
    onClearPoints: clearCurrentPoints,
    onRemoveLastPoint: removeLastPoint,
    onCopyMeasurement: handleCopyMeasurement,
    onPasteMeasurement: handlePasteMeasurement,
    onDeleteMeasurement: handleDeleteMeasurement,
    onCancelCutout: cancelCutoutFlow,
    onCancelPlacing: cancelPlacing
  });

  const handlePointClickWrapper = async (point: Point) => {
    if (isPlacingCopy) {
      await handlePlaceCopy(point);
      return;
    }
    await handlePointClick(point);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-900 text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  if (showWizard) {
    return (
      <ProjectWizard
        initialProjectName={currentProject?.name}
        initialProjectId={currentProject?.id}
        onComplete={() => {
          setShowWizard(false);
          setHasProjects(true);
        }}
        onCancel={() => setShowWizard(false)}
      />
    );
  }

  if (hasProjects === false && !currentProject) {
    return <Onboarding onGetStarted={() => setShowWizard(true)} />;
  }

  return (
    <div className="min-h-screen max-w-screen overflow-x-hidden bg-white text-gray-900 flex flex-col">
      <div className="bg-gray-100 border-b border-gray-300 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold text-gray-900">MensuraFlow</h1>
          <ProjectSelector onCreateNew={() => setShowWizard(true)} />
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-900"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>

      {currentPlan && (
        <>
          <div className="bg-gray-50 border-b border-gray-300 px-6 flex gap-1">
            <button
              onClick={() => setActiveTab('messungen')}
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'messungen'
                  ? 'border-gray-900 text-gray-900 bg-white'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Messen
            </button>
            <button
              onClick={() => setActiveTab('zusammenfassung')}
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'zusammenfassung'
                  ? 'border-gray-900 text-gray-900 bg-white'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Daten
            </button>
            <button
              onClick={() => setActiveTab('einstellungen')}
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'einstellungen'
                  ? 'border-gray-900 text-gray-900 bg-white'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Einstellungen
            </button>
          </div>
        </>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {currentPlan && activeTab === 'messungen' && (
          <PlanNavigation isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        )}

        <div className="flex-1 flex flex-col overflow-hidden relative">
          {currentPlan ? (
            <>
              {activeTab === 'messungen' ? (
                <>
                  {!isPlacingCopy && toolState.activeTool !== 'boden' && (
                    <div className="flex-shrink-0 p-4">
                      <ToolInstructions />
                    </div>
                  )}

                  {isPlacingCopy && (
                    <div className="flex-shrink-0 p-4">
                      <div className="bg-blue-100 border border-blue-300 px-4 py-2 rounded">
                        <div className="text-blue-900 text-sm">
                          Click to place the copied object. Press Escape to cancel.
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex-shrink-0">
                    <Toolbar />
                  </div>

                  <div className="flex-1 px-4 pb-4 overflow-hidden">
                    <DXFCanvas
                      onPointClick={handlePointClickWrapper}
                      onCursorMove={handleCursorMove}
                      isPlacingCopy={isPlacingCopy}
                      copiedMeasurement={copiedMeasurement}
                      placementPosition={placementPosition}
                      onDuplicate={() => {
                        handleCopyMeasurement();
                        handlePasteMeasurement();
                      }}
                      onDelete={handleDeleteMeasurement}
                      onCutout={() => {
                        if (toolState.selectedMeasurement) {
                          startCutoutFromMeasurement(toolState.selectedMeasurement.id);
                        }
                      }}
                    />
                  </div>
                </>
              ) : activeTab === 'zusammenfassung' ? (
                <div className="flex-1 p-6 overflow-y-auto">
                  <div className="max-w-5xl mx-auto">
                    <SummaryPanel />
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-hidden">
                  <FinishCatalog />
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-50">
              <div className="text-center max-w-2xl w-full px-6">
                <h2 className="text-2xl font-semibold mb-4 text-gray-900">No Plan Selected</h2>
                <p className="text-gray-600 mb-8">
                  {currentProject
                    ? 'This project has no plans yet. Use the wizard to add plans to your project.'
                    : 'Select a project to view its plans'}
                </p>
                {currentProject && (
                  <button
                    onClick={() => setShowWizard(true)}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Add Plans to Project
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {currentPlan && activeTab === 'messungen' && (
          <PropertiesPanel
            onDelete={handleDeleteMeasurement}
            isOpen={propertiesOpen}
            onToggle={() => setPropertiesOpen(!propertiesOpen)}
          />
        )}
      </div>

      <LineTypeDialog
        isOpen={showLineTypeDialog}
        onSelect={handleLineTypeSelect}
        onCancel={handleLineTypeCancel}
      />

      {cutoutModalStep === 'shape' && (
        <CutoutShapeModal
          onSelectShape={(shape) => selectCutoutShape(shape)}
          onCancel={() => cancelCutoutFlow()}
        />
      )}

      {cutoutModalStep === 'scope' && currentPlan && (
        <CutoutTargetModal
          measurements={measurements.filter(m => m.plan_id === currentPlan.id)}
          cutoutPoints={cutoutDraft.points}
          sourceMeasurementId={cutoutDraft.created_from_measurement_id}
          onApply={async (targetIds) => {
            await applyCutoutToTargets(targetIds);
            await loadMeasurements();
          }}
          onCancel={() => cancelCutoutFlow()}
        />
      )}

      {toolState.bodenMode.panelOpen && currentPlan?.type === 'ground' && activeTab === 'messungen' && (
        <BodenFloatingPanel
          onApplyFinish={handleApplyFinish}
          onRemoveFinish={handleRemoveFinish}
        />
      )}
    </div>
  );
}

export default App;
