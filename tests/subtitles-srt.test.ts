import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  parseSrtTimestampToMicros,
  formatMicrosToSrtTimestamp,
  parseSrtContent,
  cuesToTextOverlays,
  textOverlaysToSrt,
} from '../src/core/timeline/subtitles';
import { MICROS_PER_SECOND, secondsToMicros } from '../src/core/models/timeline';

describe('Phase 5: Subtitle & SRT Parsing Pipeline', () => {
  it('accurately parses SRT timestamps into integer microseconds', () => {
    // 00:00:01,500 = 1.5 seconds = 1,500,000 µs
    const us1 = parseSrtTimestampToMicros('00:00:01,500');
    assert.strictEqual(us1, 1_500_000);

    // 01:02:03.450 (dot notation) = (3600 + 120 + 3.450) * 1,000,000 = 3,723,450,000 µs
    const us2 = parseSrtTimestampToMicros('01:02:03.450');
    assert.strictEqual(us2, 3_723_450_000);

    // Malformed input falls back safely
    assert.strictEqual(parseSrtTimestampToMicros('invalid'), 0);
  });

  it('accurately formats integer microseconds back into standard SRT timestamp', () => {
    const formatted = formatMicrosToSrtTimestamp(1_500_000);
    assert.strictEqual(formatted, '00:00:01,500');

    const formattedLong = formatMicrosToSrtTimestamp(3_723_450_000);
    assert.strictEqual(formattedLong, '01:02:03,450');
  });

  it('parses full multiline SRT text into structured cues', () => {
    const srtText = `1
00:00:01,000 --> 00:00:03,000
First subtitle line

2
00:00:03,500 --> 00:00:06,000
Second subtitle line with
multiple sentences.`;

    const cues = parseSrtContent(srtText);
    assert.strictEqual(cues.length, 2);

    assert.strictEqual(cues[0].index, 1);
    assert.strictEqual(cues[0].startUs, secondsToMicros(1));
    assert.strictEqual(cues[0].endUs, secondsToMicros(3));
    assert.strictEqual(cues[0].text, 'First subtitle line');

    assert.strictEqual(cues[1].index, 2);
    assert.strictEqual(cues[1].startUs, 3_500_000);
    assert.strictEqual(cues[1].endUs, 6_000_000);
    assert.ok(cues[1].text.includes('multiple sentences.'));
  });

  it('translates subtitle cues into TextOverlay clips and roundtrips to SRT string', () => {
    const srtText = `1
00:00:00,500 --> 00:00:02,000
NovaCut Intro

2
00:00:02,500 --> 00:00:05,000
CapCut-grade Multitrack`;

    const cues = parseSrtContent(srtText);
    const overlays = cuesToTextOverlays(cues, 'track_text_1');

    assert.strictEqual(overlays.length, 2);
    assert.strictEqual(overlays[0].type, 'text');
    assert.strictEqual(overlays[0].trackId, 'track_text_1');
    assert.strictEqual(overlays[0].text, 'NovaCut Intro');
    assert.strictEqual(overlays[0].timelineRange.startUs, 500_000);
    assert.strictEqual(overlays[0].timelineRange.durationUs, 1_500_000);

    const generatedSrt = textOverlaysToSrt(overlays);
    assert.ok(generatedSrt.includes('NovaCut Intro'));
    assert.ok(generatedSrt.includes('CapCut-grade Multitrack'));
    assert.ok(generatedSrt.includes('00:00:00,500 --> 00:00:02,000'));
  });
});
