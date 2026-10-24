import {
  Project,
  ProjectMetadata,
  DEFAULT_PROJECT_SETTINGS,
  CURRENT_SCHEMA_VERSION,
  AspectRatio,
} from '../models/project';
import { DEFAULT_EXPORT_SETTINGS } from '../models/export';
import { migrateProject } from './migration';

export interface StorageDriver {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * Built-in in-memory fallback storage driver (always available)
 */
export class MemoryStorageDriver implements StorageDriver {
  private store = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) || null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }
}

const PROJECTS_INDEX_KEY = 'novacut_projects_index';
const PROJECT_PREFIX = 'novacut_project_';

export class ProjectStorage {
  private driver: StorageDriver;

  constructor(driver?: StorageDriver) {
    this.driver = driver || new MemoryStorageDriver();
  }

  public setDriver(driver: StorageDriver): void {
    this.driver = driver;
  }

  /**
   * Creates a new blank project with default tracks.
   */
  public createProject(
    title: string = 'Untitled Project',
    aspectRatio: AspectRatio = '9:16'
  ): Project {
    const id = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();
    const settings = DEFAULT_PROJECT_SETTINGS[aspectRatio];

    const project: Project = {
      metadata: {
        id,
        title,
        createdAt: now,
        updatedAt: now,
        durationUs: 0,
        schemaVersion: CURRENT_SCHEMA_VERSION,
      },
      settings,
      tracks: [
        {
          id: `track_video_1`,
          type: 'video',
          name: 'Main Video',
          isMuted: false,
          isLocked: false,
          isVisible: true,
          zIndex: 1,
          clips: [],
        },
        {
          id: `track_audio_1`,
          type: 'audio',
          name: 'Audio Track',
          isMuted: false,
          isLocked: false,
          isVisible: true,
          zIndex: 0,
          clips: [],
        },
        {
          id: `track_text_1`,
          type: 'text',
          name: 'Text & Titles',
          isMuted: false,
          isLocked: false,
          isVisible: true,
          zIndex: 2,
          clips: [],
        },
      ],
      exportSettings: {
        ...DEFAULT_EXPORT_SETTINGS,
        width: settings.width,
        height: settings.height,
        fps: settings.fps as any,
      },
    };

    return project;
  }

  /**
   * Saves or updates a project in storage.
   */
  public async saveProject(project: Project): Promise<void> {
    const updatedProject: Project = {
      ...project,
      metadata: {
        ...project.metadata,
        updatedAt: Date.now(),
      },
    };

    const projectKey = `${PROJECT_PREFIX}${project.metadata.id}`;
    const serialized = JSON.stringify(updatedProject);
    await this.driver.setItem(projectKey, serialized);

    // Update index list
    const index = await this.listProjects();
    const existingIdx = index.findIndex((m) => m.id === project.metadata.id);
    if (existingIdx >= 0) {
      index[existingIdx] = updatedProject.metadata;
    } else {
      index.unshift(updatedProject.metadata);
    }
    await this.driver.setItem(PROJECTS_INDEX_KEY, JSON.stringify(index));
  }

  /**
   * Loads a project by ID and validates/migrates its schema.
   */
  public async loadProject(id: string): Promise<Project | null> {
    const projectKey = `${PROJECT_PREFIX}${id}`;
    const raw = await this.driver.getItem(projectKey);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      return migrateProject(parsed);
    } catch (err) {
      console.error(`Failed to load and parse project ${id}:`, err);
      return null;
    }
  }

  /**
   * Lists all project metadata summaries.
   */
  public async listProjects(): Promise<ProjectMetadata[]> {
    const raw = await this.driver.getItem(PROJECTS_INDEX_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as ProjectMetadata[];
    } catch {
      return [];
    }
  }

  /**
   * Deletes a project from storage.
   */
  public async deleteProject(id: string): Promise<void> {
    const projectKey = `${PROJECT_PREFIX}${id}`;
    await this.driver.removeItem(projectKey);

    const index = await this.listProjects();
    const updated = index.filter((m) => m.id !== id);
    await this.driver.setItem(PROJECTS_INDEX_KEY, JSON.stringify(updated));
  }

  /**
   * Duplicates an existing project.
   */
  public async duplicateProject(id: string, newTitle?: string): Promise<Project | null> {
    const original = await this.loadProject(id);
    if (!original) return null;

    const newId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    const duplicated: Project = {
      ...original,
      metadata: {
        ...original.metadata,
        id: newId,
        title: newTitle || `${original.metadata.title} (Copy)`,
        createdAt: now,
        updatedAt: now,
      },
    };

    await this.saveProject(duplicated);
    return duplicated;
  }
}

export const defaultProjectStorage = new ProjectStorage();
