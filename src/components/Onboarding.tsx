import { FolderPlus, Upload, Ruler } from 'lucide-react';

interface OnboardingProps {
  onGetStarted: () => void;
}

export function Onboarding({ onGetStarted }: OnboardingProps) {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Welcome to MensuraFlow</h1>
          <p className="text-xl text-gray-300">Professional measurement and takeoff tool for construction projects</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <StepCard
            icon={<FolderPlus className="w-8 h-8" />}
            step="1"
            title="Create Project"
            description="Start by creating a new project and giving it a descriptive name"
          />
          <StepCard
            icon={<Upload className="w-8 h-8" />}
            step="2"
            title="Upload Plans"
            description="Upload your DXF files including floor plans, elevations, and sections"
          />
          <StepCard
            icon={<Ruler className="w-8 h-8" />}
            step="3"
            title="Start Measuring"
            description="Measure areas, lines, windows, and doors directly on your plans"
          />
        </div>

        <div className="bg-white rounded-xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Ready to Begin?</h2>
            <p className="text-gray-600">Create your first project to get started</p>
          </div>

          <button
            onClick={onGetStarted}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-lg transition-colors"
          >
            Create Your First Project
          </button>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">What you can do with MensuraFlow:</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Import and visualize DXF files from your CAD software</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Measure areas, perimeters, and linear elements with precision</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Track windows and doors with automatic subcomponent calculations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Generate detailed reports and export to CSV for further analysis</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Manage multiple projects and plans in one organized workspace</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StepCardProps {
  icon: React.ReactNode;
  step: string;
  title: string;
  description: string;
}

function StepCard({ icon, step, title, description }: StepCardProps) {
  return (
    <div className="bg-white rounded-lg p-6 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full mb-4">
        {icon}
      </div>
      <div className="text-sm font-semibold text-blue-600 mb-2">Step {step}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}
