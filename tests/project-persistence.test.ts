import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ProjectStorage } from '../src/core/persistence/storage';
import { migrateProject } from '../src/core/persistence/migration';
import { CURRENT_SCHEMA_VERSION } from '../src/core/models/project';

describe('Project Persistence & Schema Migration', () => {
  const storage = new ProjectStorage();

  it('creates, saves, loads, duplicates, and deletes projects safely', async () => {
    // 1. Create project
    const project = storage.createProject('My Vlog', '9:16');
    assert.strictEqual(project.metadata.title, 'My Vlog');
    assert.strictEqual(project.settings.aspectRatio, '9:16');
    assert.strictEqual(project.settings.width, 1080);
    assert.strictEqual(project.settings.height, 1920);
    assert.strictEqual(project.metadata.schemaVersion, CURRENT_SCHEMA_VERSION);

    // 2. Save project
    await storage.saveProject(project);

    // 3. Load project
    const loaded = await storage.loadProject(project.metadata.id);
    assert.ok(loaded);
    assert.strictEqual(loaded?.metadata.id, project.metadata.id);
    assert.strictEqual(loaded?.metadata.title, 'My Vlog');
    assert.strictEqual(loaded?.tracks.length, 3);

    // 4. List projects
    const list = await storage.listProjects();
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].id, project.metadata.id);

    // 5. Duplicate project
    const duplicated = await storage.duplicateProject(project.metadata.id, 'My Vlog (Copy)');
    assert.ok(duplicated);
    assert.notStrictEqual(duplicated?.metadata.id, project.metadata.id);
    assert.strictEqual(duplicated?.metadata.title, 'My Vlog (Copy)');

    const listAfterDup = await storage.listProjects();
    assert.strictEqual(listAfterDup.length, 2);

    // 6. Delete original project
    await storage.deleteProject(project.metadata.id);
    const listAfterDel = await storage.listProjects();
    assert.strictEqual(listAfterDel.length, 1);
    assert.strictEqual(listAfterDel[0].id, duplicated?.metadata.id);
  });

  it('rejects invalid project data without crashing', () => {
    assert.throws(() => {
      migrateProject(null);
    });

    assert.throws(() => {
      migrateProject('invalid-string');
    });

    assert.throws(() => {
      migrateProject({});
    });
  });
});
