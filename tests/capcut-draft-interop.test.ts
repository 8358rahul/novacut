import test from 'node:test';
import assert from 'node:assert/strict';
import {
  importFromCapCutDraft,
  exportToCapCutDraft,
  validateCapCutDraft,
  normalizeAspectRatio,
} from '../src/core/capcut/capcutDraftEngine';
import { CapCutDraft } from '../src/core/capcut/capcutDraftModel';

// Authentic CapCut template.json extracted directly from capcut.apk (assets/splitscreen/split_screen_2.zip)
const AUTHENTIC_CAPCUT_TEMPLATE_JSON: CapCutDraft = {
  canvas_config: { ratio: '1:1', width: 1440, height: 1440 },
  color_space: -1,
  config: {
    adjust_max_index: 1,
    combination_max_index: 1,
    extract_audio_last_index: 1,
    lyrics_recognition_id: '',
    lyrics_sync: true,
    maintrack_adsorb: true,
    material_save_mode: 0,
    original_sound_last_index: 1,
    record_audio_last_index: 1,
    sticker_max_index: 1,
    subtitle_recognition_id: '',
    subtitle_sync: true,
    video_mute: false,
  },
  create_time: 1660293413451232,
  duration: 2240000,
  extra_info: { track_info: { template_id: '', transfer_paths: ['edit'] } },
  fps: 30,
  id: '2521285E-1A3C-438B-970F-EE7D8F8D8D18',
  keyframes: {},
  last_modified_platform: { app_id: 1775, app_version: '8.5.0', os: 'iOS', os_version: '14.8' },
  materials: {
    videos: [
      {
        cartoon_path: '',
        category_id: '',
        category_name: '',
        check_flag: 511,
        crop: {
          upper_left_x: 0,
          upper_left_y: 0,
          upper_right_x: 1,
          upper_right_y: 0,
          lower_left_x: 0,
          lower_left_y: 1,
          lower_right_x: 1,
          lower_right_y: 1,
        },
        crop_ratio: 'free',
        crop_scale: 1,
        duration: 2267000,
        extra_type_option: 0,
        formula_id: '',
        has_audio: true,
        height: 720,
        id: 'E28EE7C4-B625-43CA-9EC5-446DDDB022C4',
        intensifies_audio_path: '',
        intensifies_path: '',
        material_id: '',
        material_name: '',
        material_url: '',
        matting: { flag: 0, path: '' },
        path: 'video/1.mov',
        reverse_intensifies_path: '',
        reverse_path: '',
        source_platform: 0,
        type: 'video',
        video_algorithm: { path: '', reverse_path: '' },
        width: 1440,
      },
      {
        cartoon_path: '',
        category_id: '',
        category_name: '',
        check_flag: 511,
        crop: {
          upper_left_x: 0,
          upper_left_y: 0,
          upper_right_x: 1,
          upper_right_y: 0,
          lower_left_x: 0,
          lower_left_y: 1,
          lower_right_x: 1,
          lower_right_y: 1,
        },
        crop_ratio: 'free',
        crop_scale: 1,
        duration: 2267000,
        extra_type_option: 0,
        formula_id: '',
        has_audio: true,
        height: 720,
        id: '440C0478-C2F9-4548-9759-F4D0F7B509A9',
        intensifies_audio_path: '',
        intensifies_path: '',
        material_id: '',
        material_name: '',
        material_url: '',
        matting: { flag: 0, path: '' },
        path: 'video/1.mov',
        reverse_intensifies_path: '',
        reverse_path: '',
        source_platform: 0,
        type: 'video',
        video_algorithm: { path: '', reverse_path: '' },
        width: 1440,
      },
    ],
  },
  name: '',
  new_version: '55.0.0',
  platform: { app_id: 1775, app_version: '8.5.0', os: 'iOS', os_version: '14.8' },
  render_index_track_mode_on: false,
  source: 'jianying',
  static_cover_image_path: '',
  tracks: [
    {
      attribute: 0,
      flag: 0,
      id: '4DD639A3-5990-445D-B5C3-EDB3C135A039',
      segments: [
        {
          cartoon: false,
          clip: {
            alpha: 1,
            flip: { horizontal: false, vertical: false },
            rotation: 0,
            scale: { x: 1, y: 1 },
            transform: { x: 0, y: 0.25 },
          },
          enable_adjust: true,
          enable_color_curves: true,
          enable_color_wheels: true,
          enable_lut: true,
          group_id: '',
          hdr_settings: { intensity: 1, mode: 1, nits: 1000 },
          id: '0011D473-4986-4FD9-8CBA-720069957103',
          intensifies_audio: false,
          is_tone_modify: false,
          last_nonzero_volume: 1,
          material_id: 'E28EE7C4-B625-43CA-9EC5-446DDDB022C4',
          render_index: 0,
          reverse: false,
          source_timerange: { duration: 2240000, start: 0 },
          speed: 1,
          target_timerange: { duration: 2240000, start: 0 },
          track_attribute: 0,
          track_render_index: 0,
          visible: true,
          volume: 1,
        },
      ],
      type: 'video',
    },
    {
      attribute: 0,
      flag: 2,
      id: '8EB37F89-9CAE-4559-AF4A-416E8AFF153B',
      segments: [
        {
          cartoon: false,
          clip: {
            alpha: 1,
            flip: { horizontal: false, vertical: false },
            rotation: 0,
            scale: { x: 1, y: 1 },
            transform: { x: 0, y: -0.25 },
          },
          enable_adjust: true,
          enable_color_curves: true,
          enable_color_wheels: true,
          enable_lut: true,
          group_id: '',
          hdr_settings: { intensity: 1, mode: 1, nits: 1000 },
          id: 'E17BA8C6-3A81-4F11-B7E9-273EBB5B91F3',
          intensifies_audio: false,
          is_tone_modify: false,
          last_nonzero_volume: 1,
          material_id: '440C0478-C2F9-4548-9759-F4D0F7B509A9',
          render_index: 0,
          reverse: false,
          source_timerange: { duration: 2240000, start: 0 },
          speed: 1,
          target_timerange: { duration: 2240000, start: 0 },
          track_attribute: 0,
          track_render_index: 0,
          visible: true,
          volume: 1,
        },
      ],
      type: 'video',
    },
  ],
  update_time: 1660296004687848,
  version: 360000,
} as unknown as CapCutDraft;

test('CapCut Draft Interop Engine', async (t) => {
  await t.test('validates authentic CapCut draft schema structure', () => {
    assert.equal(validateCapCutDraft(AUTHENTIC_CAPCUT_TEMPLATE_JSON), true);
    assert.equal(validateCapCutDraft(null), false);
    assert.equal(validateCapCutDraft({}), false);
    assert.equal(validateCapCutDraft({ duration: 1000 }), false);
  });

  await t.test('normalizes CapCut aspect ratio properly', () => {
    assert.equal(normalizeAspectRatio('1:1'), '1:1');
    assert.equal(normalizeAspectRatio('9:16'), '9:16');
    assert.equal(normalizeAspectRatio('16:9'), '16:9');
    assert.equal(normalizeAspectRatio('unsupported_ratio'), '9:16');
  });

  await t.test('imports authentic CapCut draft into NovaCut Project without precision loss', () => {
    const project = importFromCapCutDraft(AUTHENTIC_CAPCUT_TEMPLATE_JSON);

    // Verify metadata and settings
    assert.equal(project.metadata.id, '2521285E-1A3C-438B-970F-EE7D8F8D8D18');
    assert.equal(project.metadata.durationUs, 2240000); // 2.24 seconds exact
    assert.equal(project.settings.aspectRatio, '1:1');
    assert.equal(project.settings.width, 1440);
    assert.equal(project.settings.height, 1440);
    assert.equal(project.settings.fps, 30);

    // Verify tracks and flags: flag 0 is main video track, flag 2 is PIP overlay track
    assert.equal(project.tracks.length, 2);
    assert.equal(project.tracks[0].type, 'video');
    assert.equal(project.tracks[0].name, 'Main Track');
    assert.equal(project.tracks[1].type, 'overlay');
    assert.match(project.tracks[1].name, /PIP/);

    // Verify segments and spatial coordinates
    const topClip = project.clips!['0011D473-4986-4FD9-8CBA-720069957103'] as any;
    assert.ok(topClip);
    assert.equal(topClip.timelineRange.durationUs, 2240000);
    // Transform: x = 0 * 1440 = 0, y = -0.25 * 1440 = -360
    assert.equal(topClip.transform.translateX, 0);
    assert.equal(topClip.transform.translateY, -360);

    const bottomClip = project.clips!['E17BA8C6-3A81-4F11-B7E9-273EBB5B91F3'] as any;
    assert.ok(bottomClip);
    assert.equal(bottomClip.timelineRange.durationUs, 2240000);
    // Transform: x = 0 * 1440 = 0, y = -(-0.25) * 1440 = 360
    assert.equal(bottomClip.transform.translateX, 0);
    assert.equal(bottomClip.transform.translateY, 360);

    // Verify assets
    assert.ok(project.assets!['E28EE7C4-B625-43CA-9EC5-446DDDB022C4']);
    assert.equal(project.assets!['E28EE7C4-B625-43CA-9EC5-446DDDB022C4'].metadata.width, 1440);
  });

  await t.test('performs bidirectional roundtrip from NovaCut Project back to CapCut Draft', () => {
    const project = importFromCapCutDraft(AUTHENTIC_CAPCUT_TEMPLATE_JSON);
    const exportedDraft = exportToCapCutDraft(project);

    assert.equal(exportedDraft.duration, 2240000);
    assert.equal(exportedDraft.canvas_config.ratio, '1:1');
    assert.equal(exportedDraft.canvas_config.width, 1440);
    assert.equal(exportedDraft.canvas_config.height, 1440);
    assert.equal(exportedDraft.tracks.length, 2);

    // Main track flag must be 0, overlay track flag must be 2
    assert.equal(exportedDraft.tracks[0].flag, 0);
    assert.equal(exportedDraft.tracks[1].flag, 2);

    // Coordinates roundtrip: top slot normY should be 0.25, bottom slot normY should be -0.25
    assert.equal(exportedDraft.tracks[0].segments[0].clip.transform.y, 0.25);
    assert.equal(exportedDraft.tracks[1].segments[0].clip.transform.y, -0.25);

    // Adsorption must be true
    assert.equal(exportedDraft.config.maintrack_adsorb, true);
  });
});
