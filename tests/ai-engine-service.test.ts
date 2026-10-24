import test from 'node:test';
import assert from 'node:assert/strict';
import { AIEngineService } from '../src/services/aiEngineService';

test('NovaCut AI Engine Client Service', async (t) => {
  await t.test('initializes with custom base URL', () => {
    const service = new AIEngineService('http://127.0.0.1:8765');
    assert.ok(service);
  });

  await t.test('formats cutout and enhance requests properly', async () => {
    const service = new AIEngineService('http://127.0.0.1:8765');

    // Mock global fetch to verify JSON body payloads
    const originalFetch = globalThis.fetch;
    let interceptedUrl = '';
    let interceptedBody: any = null;

    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      interceptedUrl = url;
      interceptedBody = init?.body ? JSON.parse(init.body as string) : null;
      return {
        ok: true,
        json: async () => ({ status: 'success', intercepted: true }),
      } as any;
    }) as any;

    try {
      await service.removeBackground('/storage/photo.jpg', 4, 3);
      assert.equal(interceptedUrl, 'http://127.0.0.1:8765/ai/remove-bg');
      assert.equal(interceptedBody.imagePath, '/storage/photo.jpg');
      assert.equal(interceptedBody.iterations, 4);
      assert.equal(interceptedBody.featherRadius, 3);

      await service.enhanceImage('/storage/photo.jpg', 'hdr', 1.2);
      assert.equal(interceptedUrl, 'http://127.0.0.1:8765/ai/enhance');
      assert.equal(interceptedBody.mode, 'hdr');
      assert.equal(interceptedBody.intensity, 1.2);

      await service.autoReframe('/storage/video.mp4', '9:16');
      assert.equal(interceptedUrl, 'http://127.0.0.1:8765/ai/auto-reframe');
      assert.equal(interceptedBody.targetAspect, '9:16');

      const beats = await service.detectAudioBeats('/storage/song.mp3', 128, 30.0);
      assert.equal(interceptedUrl, 'http://127.0.0.1:8765/ai/detect-beats');
      assert.equal(interceptedBody.bpm, 128);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test('automatically attaches fullUrl from downloadUrl', async () => {
    const service = new AIEngineService('http://127.0.0.1:8765');
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () => {
      return {
        ok: true,
        json: async () => ({ status: 'success', downloadUrl: '/cache/cutout_123.png' }),
      } as any;
    }) as any;

    try {
      const res = await service.removeBackground('/storage/photo.jpg');
      assert.equal(res.downloadUrl, '/cache/cutout_123.png');
      assert.equal(res.fullUrl, 'http://127.0.0.1:8765/cache/cutout_123.png');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
