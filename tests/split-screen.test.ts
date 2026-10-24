import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SPLIT_SCREEN_LAYOUTS,
  createSplitScreenProject,
  buildSplitScreenCapCutDraft,
  SplitScreenLayoutType,
} from '../src/core/splitscreen/splitScreenEngine';

test('CapCut Split-Screen & Multi-Track Collage Engine', async (t) => {
  await t.test('provides all 7 authentic CapCut split-screen layouts', () => {
    const expectedLayouts: SplitScreenLayoutType[] = [
      '2-split-horizontal',
      '2-split-vertical',
      '3-split-horizontal',
      '3-split-hero',
      '4-split-quad',
      '6-split-grid',
      '9-split-grid',
    ];

    for (const key of expectedLayouts) {
      assert.ok(SPLIT_SCREEN_LAYOUTS[key], `Layout ${key} should exist`);
      assert.ok(SPLIT_SCREEN_LAYOUTS[key].slots.length > 0);
    }
  });

  await t.test('accurately calculates 4-quadrant layout matching CapCut split_screen_4.zip', () => {
    const quad = SPLIT_SCREEN_LAYOUTS['4-split-quad'];
    assert.equal(quad.slotCount, 4);

    const [tl, tr, bl, br] = quad.slots;
    // Top-Left: (-0.25, 0.25)
    assert.equal(tl.normX, -0.25);
    assert.equal(tl.normY, 0.25);

    // Top-Right: (0.25, 0.25)
    assert.equal(tr.normX, 0.25);
    assert.equal(tr.normY, 0.25);

    // Bottom-Left: (-0.25, -0.25)
    assert.equal(bl.normX, -0.25);
    assert.equal(bl.normY, -0.25);

    // Bottom-Right: (0.25, -0.25)
    assert.equal(br.normX, 0.25);
    assert.equal(br.normY, -0.25);
  });

  await t.test('creates multi-track project with synchronous timing and PIP overlay tracks', () => {
    const project = createSplitScreenProject({
      layoutType: '4-split-quad',
      durationUs: 4_000_000,
      aspectRatio: '1:1',
    });

    assert.equal(project.metadata.durationUs, 4_000_000);
    assert.equal(project.tracks.length, 4);

    // Track 0 must be main video track
    assert.equal(project.tracks[0].type, 'video');
    assert.match(project.tracks[0].name, /Main Track/);

    // Tracks 1, 2, 3 must be overlay / PIP tracks
    for (let i = 1; i <= 3; i++) {
      assert.equal(project.tracks[i].type, 'overlay');
      assert.match(project.tracks[i].name, /PIP Track/);
    }

    // Verify clips count and bounds
    const clipKeys = Object.keys(project.clips!);
    assert.equal(clipKeys.length, 4);

    for (const clipId of clipKeys) {
      const clip = project.clips![clipId] as any;
      assert.equal(clip.timelineRange.startUs, 0);
      assert.equal(clip.timelineRange.durationUs, 4_000_000);
    }

    // Verify pixel transforms for 1440x1440 canvas
    const tlClip = project.clips!['split_clip_1'] as any;
    assert.equal(tlClip.transform.translateX, -360); // -0.25 * 1440
    assert.equal(tlClip.transform.translateY, -360); // -(0.25 * 1440)

    const brClip = project.clips!['split_clip_4'] as any;
    assert.equal(brClip.transform.translateX, 360);  // 0.25 * 1440
    assert.equal(brClip.transform.translateY, 360);   // -(-0.25 * 1440)
  });

  await t.test('builds authentic CapCut template.json draft directly from split-screen layout', () => {
    const draft = buildSplitScreenCapCutDraft({
      layoutType: '3-split-horizontal',
      durationUs: 3_000_000,
    });

    assert.equal(draft.duration, 3_000_000);
    assert.equal(draft.source, 'jianying');
    assert.equal(draft.config.maintrack_adsorb, true);
    assert.equal(draft.tracks.length, 3);

    // Track 0 is main track (flag 0)
    assert.equal(draft.tracks[0].flag, 0);
    assert.equal(draft.tracks[0].segments[0].clip.transform.y, 0.33333335);

    // Track 1 & 2 are PIP tracks (flag 2)
    assert.equal(draft.tracks[1].flag, 2);
    assert.equal(draft.tracks[1].segments[0].clip.transform.y, 0.0);

    assert.equal(draft.tracks[2].flag, 2);
    assert.equal(draft.tracks[2].segments[0].clip.transform.y, -0.3333333);

    // Materials match tracks count
    assert.equal(draft.materials.videos.length, 3);
  });
});

