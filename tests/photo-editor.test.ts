import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateCanvasDimensions,
  createInitialPhotoState,
  PhotoEditorEngine,
  PHOTO_ASPECT_RATIOS,
  PHOTO_FILTERS,
} from '../src/core/photo/photoEngine';

describe('CapCut Photo Retouch & Canvas Engine', () => {
  it('calculates proper canvas dimensions preserving aspect ratio bounding box', () => {
    const screenWidth = 360;
    const screenHeight = 640;

    const squareDim = calculateCanvasDimensions('1:1', screenWidth, screenHeight);
    assert.strictEqual(squareDim.width, squareDim.height);
    assert.ok(squareDim.width <= screenWidth);

    const verticalDim = calculateCanvasDimensions('9:16', screenWidth, screenHeight);
    assert.ok(verticalDim.height > verticalDim.width);
    const calculatedRatio = verticalDim.width / verticalDim.height;
    assert.ok(Math.abs(calculatedRatio - 9 / 16) < 0.02);

    const cinematicDim = calculateCanvasDimensions('2.35:1', screenWidth, screenHeight);
    assert.ok(cinematicDim.width > cinematicDim.height);
  });

  it('initializes with CapCut standard defaults', () => {
    const state = createInitialPhotoState('file:///test/image.jpg');
    assert.strictEqual(state.imageUri, 'file:///test/image.jpg');
    assert.strictEqual(state.aspectRatio, '1:1');
    assert.strictEqual(state.rotationDeg, 0);
    assert.strictEqual(state.flipHorizontal, false);
    assert.strictEqual(state.flipVertical, false);
    assert.strictEqual(state.activeFilter, 'normal');
    assert.strictEqual(state.adjustments.brightness, 0);
    assert.strictEqual(state.adjustments.contrast, 1.0);
    assert.strictEqual(state.adjustments.saturation, 1.0);
    assert.strictEqual(state.adjustments.temperature, 0);
    assert.strictEqual(state.textOverlays.length, 0);
    assert.strictEqual(state.stickers.length, 0);
  });

  it('contains comprehensive aspect ratio presets and filters', () => {
    assert.ok(PHOTO_ASPECT_RATIOS.length >= 7);
    const ratioKeys = PHOTO_ASPECT_RATIOS.map((r) => r.ratio);
    assert.ok(ratioKeys.includes('1:1'));
    assert.ok(ratioKeys.includes('9:16'));
    assert.ok(ratioKeys.includes('16:9'));
    assert.ok(ratioKeys.includes('4:5'));
    assert.ok(ratioKeys.includes('3:4'));
    assert.ok(ratioKeys.includes('2:1'));
    assert.ok(ratioKeys.includes('2.35:1'));

    assert.ok(PHOTO_FILTERS.length >= 8);
    const filterIds = PHOTO_FILTERS.map((f) => f.id);
    assert.ok(filterIds.includes('normal'));
    assert.ok(filterIds.includes('teal_orange'));
    assert.ok(filterIds.includes('vintage_70s'));
    assert.ok(filterIds.includes('cyberpunk'));
    assert.ok(filterIds.includes('monochrome'));
  });

  it('supports interactive operations and complete Undo/Redo stack in PhotoEditorEngine', () => {
    const initialState = createInitialPhotoState('file:///test/photo.jpg');
    const engine = new PhotoEditorEngine(initialState);

    // 1. Change aspect ratio
    engine.setAspectRatio('9:16');
    assert.strictEqual(engine.getState().aspectRatio, '9:16');

    // 2. Apply LUT Filter
    engine.applyFilter('teal_orange');
    assert.strictEqual(engine.getState().activeFilter, 'teal_orange');
    assert.strictEqual(engine.getState().adjustments.contrast, 1.25);

    // 3. Add text overlay
    engine.addTextOverlay('CapCut Summer Vlog', '#FF0055', 40, 50);
    assert.strictEqual(engine.getState().textOverlays.length, 1);
    assert.strictEqual(engine.getState().textOverlays[0].text, 'CapCut Summer Vlog');
    const textId = engine.getState().textOverlays[0].id;

    // 4. Add sticker
    engine.addSticker('🔥', 30, 40);
    assert.strictEqual(engine.getState().stickers.length, 1);
    assert.strictEqual(engine.getState().stickers[0].emoji, '🔥');
    const stickerId = engine.getState().stickers[0].id;

    // 5. Rotate and flip
    engine.rotateClockwise();
    assert.strictEqual(engine.getState().rotationDeg, 90);
    engine.toggleFlipHorizontal();
    assert.strictEqual(engine.getState().flipHorizontal, true);

    // 6. Test Undo chain
    assert.strictEqual(engine.canUndo(), true);
    engine.undo(); // undo flipHorizontal
    assert.strictEqual(engine.getState().flipHorizontal, false);

    engine.undo(); // undo rotateClockwise
    assert.strictEqual(engine.getState().rotationDeg, 0);

    engine.undo(); // undo addSticker
    assert.strictEqual(engine.getState().stickers.length, 0);

    engine.undo(); // undo addTextOverlay
    assert.strictEqual(engine.getState().textOverlays.length, 0);

    // 7. Test Redo chain
    assert.strictEqual(engine.canRedo(), true);
    engine.redo(); // redo addTextOverlay
    assert.strictEqual(engine.getState().textOverlays.length, 1);

    engine.redo(); // redo addSticker
    assert.strictEqual(engine.getState().stickers.length, 1);

    // 8. Remove overlay and sticker
    engine.removeTextOverlay(textId);
    assert.strictEqual(engine.getState().textOverlays.length, 0);

    engine.removeSticker(stickerId);
    assert.strictEqual(engine.getState().stickers.length, 0);
  });
});
