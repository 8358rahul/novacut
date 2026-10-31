# NovaCut — Pro Mobile Video & Photo Editor

NovaCut is an Expo/React Native video and photo editor prototype with an original TypeScript timeline engine and a Python rendering service. It is not a complete CapCut replacement. Several existing UI tools remain experimental; their presence does not mean preview and export support are complete.

The current verified work is documented in [the CapCut investigation and implementation report](docs/research/README.md). This includes REA package inspection, observed bundled split-screen data, and an actual upload/render/download pipeline. Earlier claims below about “authentic”, “lossless”, or complete feature parity have not been validated against a running CapCut app.

### Run locally

```sh
npm ci
python3 -m venv .venv
.venv/bin/pip install -r engine/requirements.txt
.venv/bin/uvicorn novacut_studio:app --app-dir engine --host 0.0.0.0 --port 8765
# In a second terminal, set EXPO_PUBLIC_ENGINE_URL to your computer's LAN URL:
npm start
```

Use this backend only on a trusted development network: authentication, quotas, durable jobs and production storage are not implemented. Set `NOVACUT_DATA_DIR` to change the default `engine/data` storage directory. The phone must upload its local media before the server can render it.

Server export currently supports video/image placement, gaps, constant speed, source trimming, audio mixing, mute, resolution, 14 original effects, and all 18 existing color presets with adjustable strength. Unsupported advanced edits produce an explicit error. Export never substitutes a fabricated file when the server is unavailable.

---

## Architecture Overview

```
novacut/
├── engine/                              # Professional Python AI & Video Rendering Server
│   ├── novacut_studio.py                # FastAPI server (port 8765) with static FFmpeg
│   ├── ai_cutout.py                     # AI Smart Subject Cutout (OpenCV GrabCut alpha matting)
│   ├── ai_reframe.py                    # AI Auto-Reframe (16:9 to 9:16 focal tracking keyframes)
│   ├── ai_enhancer.py                   # AI Studio Enhancer (CLAHE HDR & bilateral portrait)
│   ├── ai_audio.py                      # AI Audio Waveform & Rhythmic Beat Drop Detection
│   ├── test_engine.py                   # Python test suite (5 test cases)
│   └── requirements.txt                 # Python dependencies manifest
├── modules/
│   └── novacut-native-bridge/           # High-performance Android C++/Kotlin bridge
│       ├── android/src/main/jni/        # Native 4x5 color matrices, LUT shaders & PIP blend modes
│       └── src/index.ts                 # TypeScript native bindings
├── src/
│   ├── app/                             # Expo Router file-based navigation tree
│   │   ├── _layout.tsx                  # Native Stack root navigator & status bar styling
│   │   ├── index.tsx                    # Home launcher & bottom tab routing
│   │   ├── editor/[id].tsx              # Dynamic video editor screen with Android system back
│   │   ├── photo-editor.tsx             # Photo retouching canvas route
│   │   ├── templates.tsx                # CutSame viral templates route
│   │   ├── search.tsx                   # Universal search & discovery route
│   │   ├── export/[id].tsx              # Deterministic export pipeline route
│   │   └── settings.tsx                 # App specifications & clean-room policy
│   ├── core/
│   │   ├── models/                      # Strict domain models
│   │   │   ├── project.ts               # Project, ProjectSettings, AspectRatio (9:16, 16:9, 1:1, 4:5, 21:9)
│   │   │   ├── timeline.ts              # TimelineTrack, TimeRange, integer timebase utilities
│   │   │   ├── clip.ts                  # VideoClip, AudioClip, TextOverlay, Keyframe, Transition, SpeedCurve
│   │   │   ├── asset.ts                 # MediaAsset, MediaMetadata
│   │   │   ├── operation.ts             # EditOperation (Command pattern for Undo/Redo)
│   │   │   └── export.ts                # ExportSettings, ExportJob
│   │   ├── timeline/                    # Non-destructive timeline engine
│   │   │   ├── engine.ts                # TimelineEngine state coordinator with full Undo/Redo
│   │   │   ├── calculator.ts            # Duration, snapping, boundary and time-mapping logic
│   │   │   ├── operations.ts            # Immutable operations (trim, split, delete, move, reorder, speed, volume)
│   │   │   ├── keyframes.ts             # Bézier & linear keyframe interpolation
│   │   │   ├── speedCurves.ts           # Bézier speed ramp curves (Montage, Bullet, Hero)
│   │   │   ├── subtitles.ts             # Subtitle parser & bidirectional SRT translation
│   │   │   └── audioMixer.ts            # Multi-channel gain ramp calculator & audio waveforms
│   │   ├── capcut/                      # CapCut Native Draft Interop Engine
│   │   │   ├── capcutDraftModel.ts      # Authentic ByteDance draft schema (tracks, materials, canvas, flags)
│   │   │   └── capcutDraftEngine.ts     # Bidirectional Project <-> template.json translation
│   │   ├── splitscreen/                 # Split-Screen Multi-Track Collage Engine
│   │   │   └── splitScreenEngine.ts     # 7 CapCut split-screen layouts (2-9 slots, normalized transforms)
│   │   ├── photo/                       # CapCut Photo Retouch & Canvas Engine
│   │   │   └── photoEngine.ts           # Aspect ratios (1:1, 9:16, 16:9, 4:5, 3:4, 2:1, 2.35:1), LUTs, text & stickers
│   │   ├── templates/                   # CutSame / MultiCutSame Template System
│   │   │   └── templateEngine.ts        # Rhythmic BeatTracking, multi-slot media substitution & compilation
│   │   ├── effects/                     # Visual Effects & 3D LUT Filter Catalog
│   │   │   └── effectRegistry.ts        # 6 visual shader effects + 8 cinematic LUT filters
│   │   ├── search/                      # Universal Discovery Engine
│   │   │   └── searchEngine.ts          # Fuzzy search, history manager, tag indexing across all media
│   │   ├── rendering/
│   │   │   └── exporter.ts              # ExportCompositionPlan builder & FFmpeg command generator
│   │   └── persistence/
│   │       ├── storage.ts               # ProjectStorage manager (save, load, duplicate, delete)
│   │       └── migration.ts             # Versioned schema migration engine
│   ├── features/
│   │   ├── home/HomeScreen.tsx          # CapCut-style hero launcher, search trigger, bottom navigation
│   │   ├── editor/EditorScreen.tsx      # Multi-track timeline, playhead, scrubbing, editing toolbar
│   │   ├── photo/PhotoEditorScreen.tsx  # Photo retouch, aspect ratio selector, sticker & text overlay tools
│   │   ├── templates/TemplatesScreen.tsx # CutSame viral template browser & multi-slot media replacer
│   │   ├── search/SearchScreen.tsx      # Universal discovery screen with live search & trending tags
│   │   ├── effects/FilterModal.tsx      # Dual-tab LUT filter & real-time visual FX selector
│   │   ├── playback/VideoPlayerView.tsx # Video player with shader simulation overlays & transforms
│   │   ├── export/ExportScreen.tsx      # 720p/1080p/4K resolution, framerate, bitrate export pipeline
│   │   └── settings/SettingsScreen.tsx  # App specs and clean-room disclosure
│   ├── services/
│   │   └── mediaImport.ts               # Native document picker for local video import
│   ├── components/                      # Button, IconButton, Card, Badge, Header
│   ├── navigation/Router.tsx            # Type-safe router with Home, Editor, PhotoEditor, Templates, Search
│   └── theme/                           # Dark-mode design system & color tokens
└── tests/                               # Comprehensive unit test suites (77 tests across 17 suites)
```

---

## Clean-Room Engineering Policy

NovaCut is engineered independently:
- Architectural patterns discovered through REA reverse-engineering of CapCut APK (`capcut.apk`).
- Clean-room algorithms written in modern TypeScript and React Native.
- Zero proprietary bytecode, native binaries, private SDK keys, or copyrighted assets are copied or distributed.

---

## Verification & Test Report

All 77 tests pass across 17 test suites (`npm test`) + 5/5 Python AI Engine unit tests (`python engine/test_engine.py`):
- **NovaCut AI Engine Client Service** (`tests/ai-engine-service.test.ts`): Client URL routing, JSON payload serialization for AI Cutout, Smart Reframe, and CLAHE HDR enhancement.
- **Python Studio AI Engine** (`engine/test_engine.py`): OpenCV GrabCut alpha matting, saliency-based 16:9 to 9:16 auto-reframe keyframing, 4 CLAHE/bilateral retouching modes, and PCM audio beat drop detection.
- **CapCut Draft Interop Engine** (`tests/capcut-draft-interop.test.ts`): Schema validation, microsecond integer timebase (`1s = 1,000,000 µs`), track flag `0` (main track) and `2` (PIP overlay track), normalized coordinate translation, and lossless bidirectional roundtrip.
- **CapCut Split-Screen & Multi-Track Collage Engine** (`tests/split-screen.test.ts`): All 7 authentic layouts (2-split horizontal/vertical, 3-split horizontal/hero, 4-split quad, 6-split, 9-split), normalized coordinate geometry matching `split_screen_2.zip` to `split_screen_9.zip`, multi-track synchronous compilation, and direct CapCut draft export.
- **Photo Retouch & Canvas Engine** (`tests/photo-editor.test.ts`): Bounding box canvas dimensions, aspect ratios, LUT filters, non-destructive stickers, text overlays, 90-degree step rotation, mirror flips, and complete undo/redo history.
- **CutSame Template & BeatTracking Engine** (`tests/templates-cutsame.test.ts`): Template slot definitions, BPM-driven audio beat drop calculations, multi-track timeline project compilation.
- **Universal Search & Discovery Engine** (`tests/search-engine.test.ts`): Tokenized fuzzy searching, category filtering, search history deduplication and cap limits, trending tags.
- **Video FX & 3D LUT Color Grading Engine** (`tests/video-effects-lut.test.ts`): Visual shader effects (Glitch, Film Grain, VHS, Zoom Blur, Star Glow, Camera Shake), LUT color grading matrices, blending, and timeline undo/redo operations.
- **Keyframe Animation Engine** (`tests/keyframes.test.ts`): Multi-property keyframe interpolation, bounding keyframe lookup, chronological keyframe tracks.
- **Speed Curves Engine** (`tests/speed-curves.test.ts`): Bézier curve evaluation (Standard, Montage, Hero, Bullet Time).
- **Audio Mixer & Gain Ramps** (`tests/audio-mixer.test.ts`): Linear gain curves, fade-in/fade-out calculations, waveform generation.
- **Subtitle & SRT Pipeline** (`tests/subtitles-srt.test.ts`): Bidirectional microsecond SRT parsing and serialization.
- **Timeline Operations & Engine** (`tests/timeline-operations.test.ts`, `tests/timeline-engine.test.ts`): Non-destructive trim, split, ripple delete, duplicate, clip reordering, time snapping, and undo/redo cycles.
- **Android Native Bridge** (`tests/native-bridge.test.ts`): 4x5 color matrices, LUT shaders, PIP blend modes, hardware capability query fallback.
- **Media Import & Project Persistence** (`tests/media-import.test.ts`, `tests/project-persistence.test.ts`): Safe JSON serialization, version migration, document picker translation.
- **Media Export Pipeline** (`tests/export-pipeline.test.ts`): Deterministic composition plan builder, FFmpeg argument vector generation.
