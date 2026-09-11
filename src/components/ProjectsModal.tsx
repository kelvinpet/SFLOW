import React, { useState } from 'react';
import {
  FolderOpen,
  Plus,
  Trash2,
  X,
  FileVideo,
  Clock,
  Sparkles,
  Check,
  Edit3,
  Film,
  Save,
} from 'lucide-react';
import { Caption, SubtitleStyle } from '../types';
import {
  SavedProject,
  getSavedProjects,
  saveProject,
  deleteProject,
  setCurrentProjectId,
  getCurrentProjectId,
} from '../utils/projectManager';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCaptions: Caption[];
  currentStyle: SubtitleStyle;
  currentVideoName?: string;
  currentVideoType?: 'sample' | 'file';
  currentSampleVideoId?: string;
  onLoadProject: (project: SavedProject) => void;
  onStartNewProject: () => void;
  onShowToast: (toast: { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }) => void;
}

export const ProjectsModal: React.FC<ProjectsModalProps> = ({
  isOpen,
  onClose,
  currentCaptions,
  currentStyle,
  currentVideoName,
  currentVideoType = 'sample',
  currentSampleVideoId,
  onLoadProject,
  onStartNewProject,
  onShowToast,
}) => {
  const [projects, setProjects] = useState<SavedProject[]>(() => getSavedProjects());
  const [currentId, setCurrentId] = useState<string | null>(() => getCurrentProjectId());
  const [newProjectTitle, setNewProjectTitle] = useState(() =>
    currentVideoName ? currentVideoName.replace(/\.[^/.]+$/, '') : ''
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  if (!isOpen) return null;

  const handleSaveCurrentAsNew = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newProjectTitle.trim() || currentVideoName || `Project #${projects.length + 1}`;
    const newProj: SavedProject = {
      id: `proj_${Date.now()}`,
      name: title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      captionsCount: currentCaptions.length,
      videoName: currentVideoName || 'Sample Video',
      videoType: (currentVideoType || 'sample') as 'sample' | 'file',
      sampleVideoId: currentSampleVideoId,
      captions: currentCaptions,
      style: currentStyle,
    };

    const updated = saveProject(newProj);
    setProjects(updated);
    setCurrentId(newProj.id);
    onShowToast({
      type: 'success',
      title: 'Project Saved',
      message: `"${title}" has been saved to your project library.`,
    });
  };

  const handleOpenProject = (proj: SavedProject) => {
    setCurrentProjectId(proj.id);
    setCurrentId(proj.id);
    onLoadProject(proj);
    onClose();
    onShowToast({
      type: 'success',
      title: 'Project Loaded',
      message: `Loaded "${proj.name}" with ${proj.captions.length} captions.`,
    });
  };

  const handleDeleteProject = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteProject(id);
    setProjects(updated);
    if (currentId === id) setCurrentId(null);
    onShowToast({
      type: 'info',
      title: 'Project Removed',
      message: `"${name}" removed from project library.`,
    });
  };

  const handleRenameProject = (proj: SavedProject, e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editingTitle.trim()) return;
    const updatedProj: SavedProject = {
      ...proj,
      name: editingTitle.trim(),
      updatedAt: new Date().toISOString(),
    };
    const updated = saveProject(updatedProj);
    setProjects(updated);
    setEditingId(null);
    onShowToast({
      type: 'success',
      title: 'Project Renamed',
      message: `Renamed to "${editingTitle.trim()}".`,
    });
  };

  const handleCreateNewBlank = () => {
    onStartNewProject();
    onClose();
  };

  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div
      id="projects-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div
        id="projects-modal-card"
        className="w-full max-w-2xl bg-white dark:bg-zinc-950/95 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl relative text-slate-900 dark:text-zinc-100 max-h-[85vh] flex flex-col"
      >
        {/* Close Icon Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/[0.08] transition-colors z-10"
          title="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-zinc-800/80 mb-5 pr-12">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-500 dark:text-indigo-400 shadow-md shadow-indigo-600/10">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Project Library & Saved Work</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Save, manage, and switch between your subtitle video projects</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreateNewBlank}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-600/30 flex items-center gap-1.5 active:scale-95 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Blank</span>
          </button>
        </div>

        {/* Quick Save Current Workspace Banner */}
        <div className="mb-5 p-4 bg-slate-100 dark:bg-zinc-900/80 rounded-2xl border border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                Save Active Workspace ({currentCaptions.length} captions)
              </p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate max-w-xs sm:max-w-sm">
                Video: {currentVideoName || 'Sample Video'}
              </p>
            </div>
          </div>

          {/* Preferred Project Title Input Form */}
          <form onSubmit={handleSaveCurrentAsNew} className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={newProjectTitle}
              onChange={(e) => setNewProjectTitle(e.target.value)}
              placeholder="Custom project title..."
              className="bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-amber-400 shadow-inner flex-1 sm:w-48"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          </form>
        </div>

        {/* Projects Grid List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {projects.length === 0 ? (
            <div className="text-center p-8 bg-slate-50 dark:bg-zinc-900/40 rounded-2xl border border-dashed border-slate-300 dark:border-zinc-800">
              <Film className="w-10 h-10 text-slate-400 dark:text-zinc-600 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-700 dark:text-zinc-300">No Saved Projects Yet</h4>
              <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1 max-w-xs mx-auto">
                Type your preferred project title above and click Save to store it here anytime!
              </p>
            </div>
          ) : (
            projects.map((proj) => {
              const isActive = currentId === proj.id;
              const isEditing = editingId === proj.id;

              return (
                <div
                  key={proj.id}
                  onClick={() => handleOpenProject(proj)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer group flex items-center justify-between gap-4 ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-950/20'
                      : 'bg-slate-50 dark:bg-zinc-900/70 hover:bg-slate-100 dark:hover:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                        isActive
                          ? 'bg-indigo-600/30 border-indigo-400 text-indigo-500 dark:text-indigo-300'
                          : 'bg-slate-200 dark:bg-zinc-800/80 border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-white'
                      }`}
                    >
                      <FileVideo className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      {isEditing ? (
                        <form
                          onSubmit={(e) => handleRenameProject(proj, e)}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className="bg-white dark:bg-zinc-950 border border-indigo-500 rounded px-2 py-0.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                            autoFocus
                          />
                          <button type="submit" className="text-indigo-600 dark:text-indigo-400 hover:underline text-xs font-bold">
                            Save
                          </button>
                        </form>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{proj.name}</h4>
                          {isActive && (
                            <span className="px-1.5 py-0.2 bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/40 text-[9px] font-mono font-bold rounded">
                              ACTIVE
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                        <span>{proj.captionsCount} Subtitles</span>
                        <span>•</span>
                        <span className="truncate max-w-[140px] sm:max-w-[200px]">
                          {proj.videoName || 'Video'}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400 dark:text-zinc-500" />
                          {formatDate(proj.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleOpenProject(proj)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-slate-200 dark:bg-white/[0.06] hover:bg-slate-300 dark:hover:bg-white/[0.12] text-slate-800 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-white/[0.08]'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isActive ? 'Opened' : 'Open'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(proj.id);
                        setEditingTitle(proj.name);
                      }}
                      className="p-1.5 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
                      title="Rename project"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteProject(proj.id, proj.name, e)}
                      className="p-1.5 text-slate-400 dark:text-zinc-500 hover:text-rose-500 bg-slate-100 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl hover:bg-rose-500/10 hover:border-rose-500/30 transition-colors"
                      title="Delete project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
