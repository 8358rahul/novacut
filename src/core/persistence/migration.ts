import { Project, CURRENT_SCHEMA_VERSION } from '../models/project';

export interface MigrationStep {
  fromVersion: number;
  toVersion: number;
  migrate: (rawProject: any) => any;
}

const MIGRATIONS: MigrationStep[] = [
  // Future migrations will be registered here sequentially
];

export function migrateProject(rawProject: any): Project {
  if (!rawProject || typeof rawProject !== 'object') {
    throw new Error('Invalid project data: expected JSON object');
  }

  let project = { ...rawProject };
  let currentVersion = project.metadata?.schemaVersion || 0;

  if (currentVersion === 0 && !project.metadata) {
    throw new Error('Unrecognized project format: missing metadata');
  }

  while (currentVersion < CURRENT_SCHEMA_VERSION) {
    const step = MIGRATIONS.find((m) => m.fromVersion === currentVersion);
    if (!step) {
      throw new Error(
        `No migration path found for project schema version ${currentVersion} -> ${CURRENT_SCHEMA_VERSION}`
      );
    }
    project = step.migrate(project);
    currentVersion = step.toVersion;
  }

  return project as Project;
}
