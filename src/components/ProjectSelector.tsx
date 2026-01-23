import { useState, useEffect } from 'react';
import { Plus, FolderOpen, Pencil, Trash2, Check, X } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { supabase } from '../lib/supabase';
import { Project } from '../types';

interface ProjectSelectorProps {
  onCreateNew: () => void;
}

export function ProjectSelector({ onCreateNew }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const { currentProject, setCurrentProject, setPlans, setCurrentPlan } = useAppStore();

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (currentProject && !projects.find(p => p.id === currentProject.id)) {
      loadProjects();
    }
  }, [currentProject]);

  const loadProjects = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProjects(data);
      if (data.length > 0 && !currentProject) {
        selectProject(data[0]);
      }
    }
  };

  const selectProject = async (project: Project) => {
    setCurrentProject(project);

    const { data: plansData } = await supabase
      .from('plans')
      .select('*')
      .eq('project_id', project.id);

    if (plansData) {
      setPlans(plansData);
      if (plansData.length > 0) {
        setCurrentPlan(plansData[0]);
      }
    }
  };


  const startRename = () => {
    if (!currentProject) return;
    setRenameValue(currentProject.name);
    setIsRenaming(true);
  };

  const saveRename = async () => {
    if (!currentProject || !renameValue.trim()) return;

    const { error } = await supabase
      .from('projects')
      .update({ name: renameValue.trim(), updated_at: new Date().toISOString() })
      .eq('id', currentProject.id);

    if (!error) {
      const updatedProject = { ...currentProject, name: renameValue.trim() };
      setProjects(projects.map(p => p.id === currentProject.id ? updatedProject : p));
      setCurrentProject(updatedProject);
      setIsRenaming(false);
      setRenameValue('');
    }
  };

  const cancelRename = () => {
    setIsRenaming(false);
    setRenameValue('');
  };

  const deleteProject = async () => {
    if (!currentProject) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete the project "${currentProject.name}"? This will delete all plans and measurements associated with this project. This action cannot be undone.`
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', currentProject.id);

    if (!error) {
      const remainingProjects = projects.filter(p => p.id !== currentProject.id);
      setProjects(remainingProjects);
      setCurrentProject(null);
      setCurrentPlan(null);
      setPlans([]);

      if (remainingProjects.length > 0) {
        selectProject(remainingProjects[0]);
      }
    }
  };

  return (
    <div className="flex items-center gap-4">
      <FolderOpen className="w-5 h-5 text-gray-600" />

      {isRenaming ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveRename();
              if (e.key === 'Escape') cancelRename();
            }}
            className="bg-white text-gray-900 px-4 py-2 rounded border border-gray-300"
            autoFocus
          />
          <button
            onClick={saveRename}
            className="p-2 bg-green-600 hover:bg-green-700 rounded text-white"
            title="Save"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={cancelRename}
            className="p-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-900"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <select
            value={currentProject?.id || ''}
            onChange={(e) => {
              const project = projects.find(p => p.id === e.target.value);
              if (project) selectProject(project);
            }}
            className="bg-white text-gray-900 px-4 py-2 rounded border border-gray-300"
          >
            <option value="">Projekt auswählen</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          {currentProject && (
            <>
              <button
                onClick={startRename}
                className="p-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-900"
                title="Rename project"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={deleteProject}
                className="p-2 bg-red-600 hover:bg-red-700 rounded text-white"
                title="Delete project"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </>
      )}

      {!isRenaming && (
        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Neues Projekt
        </button>
      )}
    </div>
  );
}
