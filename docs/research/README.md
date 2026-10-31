# CapCut investigation and NovaCut implementation

Scope: CapCut only, following the user's instruction to leave Filmora aside.

## Evidence collected

- Tool: `rea-agents@6.8.0`, published by the requested https://github.com/morluto/rea repository. Used CLI operations directly; no global agent configuration changed.
- Input: `rea_apk/capcut.apk`, 318,814,182 bytes; SHA-256 `2dd6d36cd2fd5bef0f9fde3fe94e26804ecdf0c3545085bb6fa16c5b774c8d85`.
- REA `inspect-artifact` succeeded. Retained summary: `capcut-artifact.json`. The complete temporary evidence bundle is `/tmp/novacut-capcut-evidence.json`; regenerate it if that temporary directory is cleared.
- REA `inspect-android-package` could not run: its required caller-provided `jadx-headless-mcp 0.7.1` JAR is not configured. The exact diagnostic is in `capcut-rea.json`. No Java-method decompilation or native-function analysis is claimed.
- ZIP inspection finds 27,706 entries, native media libraries, and split-screen packages numbered 2 through 9.
- Each inspected split-screen package contains `template.json` and `config.json`. The drafts contain separate materials and tracks, integer microsecond ranges, a 1440×1440 canvas, and per-segment transform data. These are historical bundled examples, not proof of current full application behavior.
- `capcut-layout-observations.json` contains selected structural facts only. Reproduce with `python3 scripts/inspect_capcut.py > docs/research/capcut-layout-observations.json`.

REA reproduction, run package acquisition from a trusted directory outside the target project:

```sh
npm exec --yes --package rea-agents@6.8.0 -- rea inspect-artifact /absolute/path/to/capcut.apk --detail summary --evidence_output /tmp/capcut-evidence.json --format json
npm exec --yes --package rea-agents@6.8.0 -- rea inspect-android-package /absolute/path/to/capcut.apk --format json
```

Filmora reports reflect the initial inspection before scope changed. No Filmora implementation was added.

## Implemented independently

The observed separation of media, timeline placement and transforms is compatible with NovaCut's existing data model. The critical missing capability was reliable execution of that model. This change implements:

- Actual device uploads before server export, correct common media MIME types, deduplication within an export, and explicit upload failures.
- One configurable server endpoint (`EXPO_PUBLIC_ENGINE_URL`) shared by AI and export.
- Absolute timeline placement, black gaps, constant-speed video and pitch-preserving audio tempo, source trims, mixed audio, volume including zero, track order, hidden-track exclusion, and muted tracks.
- Real output download and share paths; no fabricated offline export success.
- Bounded polling with stale-result suppression after navigation or stop; stopping the client does not cancel a server render.
- Portable backend storage, UUID job/output names, request bounds, and filename containment for generated/cache/download files.
- Explicit rejection of unsupported export edits rather than silently dropping them.

This is an original implementation. No proprietary bytecode, SDKs, native libraries, artwork, media, or entire bundled templates are distributed in the app.

## Verification and remaining work

Automated tests cover real FFmpeg output frames/audio, a black timeline gap, speed, mute, upload→render→download, and empty-project rejection. Client tests check trim/speed/mute preservation, unsupported transforms, hidden tracks and upload failure. Existing algorithm tests do not prove parity with CapCut.

Not yet complete: native device/UI validation; full draft compatibility; crop/transform/opacity composition; split-screen preview/export; captions/text rendering; transitions; keyframes; speed ramps; accurate preview/export color matching; advanced effects; complete photo export; authentication; quotas; durable queue/cancellation. Existing controls and README historical feature listings should not be read as verified implementations of these features.

The backend still accepts local paths and remote URLs for development workflows. It is not suitable for public deployment until access control and media ingestion restrictions are implemented. Mobile performance and full application behavior require a device build and recorded manual tests.

### Results from this session

- TypeScript typecheck: passed.
- TypeScript tests: 95 passed.
- Python tests: 9 passed, including render checks for every advertised server effect and an upload/render/download check with color and grain applied.
- Expo lint: passes with 0 errors and 31 warnings. Three scoped React compiler suppressions document PanResponder's event-time ref access; other compiler errors were fixed through immutable engine updates and correct animation ownership.
- Browser checked the home/create-project/editor at 360×640. Compact empty-state actions and wrapped transport controls fit. Further effects-sheet interaction was interrupted by unavailable browser control; it is not recorded as verified.
- No simulator/device run or release build performed.

## Mobile and effects pass

Shared modals now respect native safe-area edges and keyboard resizing. Home creation dialogs scroll in reduced space. Header/buttons have larger touch targets, video/photo canvases respond to window size, timeline tracks scroll vertically, and transport controls wrap. Gallery project creation now imports the selected asset, and export saves the latest edits. Playback respects clip volume and constant speed.

Fourteen original FFmpeg treatments are exportable: grain, VHS, camera shake, earthquake, halo blur, soft mist, neon edge, chromatic flash, RGB glitch, scanlines, CRT noise, dreamy aura, light leak and film burn. All 18 existing color presets export through the same color-parameter model with intensity. Interactive previews remain approximations; these treatments do not establish parity with CapCut shaders. Unimplemented catalog effects are excluded from the picker.

See [feature coverage](feature-coverage.md) for the unfinished parity scope.
