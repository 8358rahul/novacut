import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  VIRAL_TEMPLATES,
  calculateBeatDropMarkers,
  compileProjectFromTemplate,
  UserSelectedMediaSlot,
} from '../src/core/templates/templateEngine';
import { MICROS_PER_SECOND } from '../src/core/models/timeline';

describe('CapCut CutSame Template & BeatTracking Engine', () => {
  it('validates viral template catalog definitions', () => {
    assert.ok(VIRAL_TEMPLATES.length >= 5);

    VIRAL_TEMPLATES.forEach((template) => {
      assert.ok(template.id.startsWith('tpl_'));
      assert.ok(template.title.length > 0);
      assert.ok(template.bpm > 0);
      assert.ok(template.slots.length >= 2);
      assert.ok(template.previewGradient.length === 2);
      assert.ok(template.tags.length > 0);

      // Verify each slot
      template.slots.forEach((slot, index) => {
        assert.strictEqual(slot.slotIndex, index);
        assert.ok(slot.durationUs > 0);
        assert.ok(['video', 'image', 'any'].includes(slot.requiredType));
      });
    });
  });

  it('calculates precise rhythmic beat drop markers for audio synchronization', () => {
    // At 120 BPM, there are 2 beats per second = 1 beat every 500,000 microseconds.
    const bpm = 120;
    const durationUs = 3 * MICROS_PER_SECOND; // 3 seconds
    const markers = calculateBeatDropMarkers(bpm, durationUs);

    assert.strictEqual(markers.length, 5); // 500k, 1000k, 1500k, 2000k, 2500k
    assert.strictEqual(markers[0], 500_000);
    assert.strictEqual(markers[1], 1_000_000);
    assert.strictEqual(markers[2], 1_500_000);
    assert.strictEqual(markers[3], 2_000_000);
    assert.strictEqual(markers[4], 2_500_000);

    // Negative or 0 BPM returns empty array safely
    assert.deepStrictEqual(calculateBeatDropMarkers(0, durationUs), []);
  });

  it('compiles user media clips into a complete multi-track timeline project', () => {
    const template = VIRAL_TEMPLATES[0]; // TikTok Beat Sync
    const mockUserMedia: UserSelectedMediaSlot[] = [
      { slotIndex: 0, uri: 'file:///media/clip0.mp4', title: 'Intro', type: 'video' },
      { slotIndex: 1, uri: 'file:///media/clip1.mp4', title: 'Drop 1', type: 'video' },
      { slotIndex: 2, uri: 'file:///media/clip2.mp4', title: 'Drop 2', type: 'video' },
      { slotIndex: 3, uri: 'file:///media/clip3.mp4', title: 'Outro', type: 'video' },
    ];

    const project = compileProjectFromTemplate(template, mockUserMedia);

    assert.ok(project.metadata.id.startsWith('proj_tpl_'));
    assert.strictEqual(project.metadata.title, template.title);
    assert.strictEqual(project.settings.aspectRatio, template.aspectRatio);
    assert.strictEqual(project.tracks.length, 3); // Video, Audio, Text tracks

    const videoTrack = project.tracks.find((t) => t.type === 'video');
    assert.ok(videoTrack);
    assert.strictEqual(videoTrack.clips.length, template.slots.length);

    const audioTrack = project.tracks.find((t) => t.type === 'audio');
    assert.ok(audioTrack);
    assert.strictEqual(audioTrack.clips.length, 1);

    const textTrack = project.tracks.find((t) => t.type === 'text');
    assert.ok(textTrack);
    assert.strictEqual(textTrack.clips.length, 1);

    // Duration should match sum of slots
    const totalSlotDuration = template.slots.reduce((sum, s) => sum + s.durationUs, 0);
    assert.strictEqual(project.metadata.durationUs, totalSlotDuration);
  });
});
