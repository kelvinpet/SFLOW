import { Caption, SubtitleStyle } from '../types';

export interface SavedProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  captionsCount: number;
  videoName?: string;
  videoType: 'sample' | 'file';
  sampleVideoId?: string;
  captions: Caption[];
  style: SubtitleStyle;
}

const PROJECTS_STORAGE_KEY = 'subly_saved_projects_list';
const CURRENT_PROJECT_ID_KEY = 'subly_current_project_id';

/**
 * Get all saved projects list from localStorage
 */
export function getSavedProjects(): SavedProject[] {
  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save or Update a Project in localStorage
 */
export function saveProject(project: SavedProject): SavedProject[] {
  const existing = getSavedProjects();
  const index = existing.findIndex((p) => p.id === project.id);
  
  let updatedList: SavedProject[];
  if (index >= 0) {
    updatedList = [...existing];
    updatedList[index] = { ...project, updatedAt: new Date().toISOString() };
  } else {
    updatedList = [project, ...existing];
  }

  try {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(updatedList));
    localStorage.setItem(CURRENT_PROJECT_ID_KEY, project.id);
  } catch (e) {
    console.warn('Failed to save project to localStorage:', e);
  }

  return updatedList;
}

/**
 * Delete a project by ID
 */
export function deleteProject(id: string): SavedProject[] {
  const existing = getSavedProjects();
  const filtered = existing.filter((p) => p.id !== id);
  try {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(filtered));
    const currentId = localStorage.getItem(CURRENT_PROJECT_ID_KEY);
    if (currentId === id) {
      localStorage.removeItem(CURRENT_PROJECT_ID_KEY);
    }
  } catch (e) {
    console.warn('Failed to delete project:', e);
  }
  return filtered;
}

/**
 * Get current active project ID
 */
export function getCurrentProjectId(): string | null {
  try {
    return localStorage.getItem(CURRENT_PROJECT_ID_KEY);
  } catch {
    return null;
  }
}

/**
 * Set current active project ID
 */
export function setCurrentProjectId(id: string): void {
  try {
    localStorage.setItem(CURRENT_PROJECT_ID_KEY, id);
  } catch {}
}
