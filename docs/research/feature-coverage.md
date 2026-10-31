# CapCut-to-NovaCut feature coverage

The requested target is comprehensive mobile editing parity. It is not achieved yet. APK resource names alone cannot verify feature behavior, server-backed capabilities, subscription behavior, or remotely downloaded effects.

| Area | NovaCut status | Required next evidence/work |
|---|---|---|
| Import, trim, split, move, undo/redo | Existing domain logic; gallery creation corrected | Native device workflow checks |
| Timeline placement, constant speed, mixed audio | Real server render tests pass | Device playback/export comparison |
| Effects | 14 original exportable treatments | JADX/runtime investigation and visual comparison; remaining catalog effects |
| Color | 18 original parameter presets, adjustable export strength | Accurate native preview renderer |
| Canvas and dialogs | Responsive dimensions, native insets, keyboard handling | iOS and Android native builds, large-text and keyboard QA |
| Multi-track overlay/collage | Models/UI exist; complete compositing unfinished | Transform/crop/opacity export and rendered layout tests |
| Text/captions | Existing editor/SRT algorithms | Font packaging, text renderer, speech transcription service |
| Transitions/keyframes/speed ramps | Existing domain algorithms | Matching preview and export execution |
| Photo editor | Existing UI/algorithms | Complete rendered photo export and device QA |
| AI cutout/reframe/enhance | Existing Python modules | Device workflow validation and quality evaluation |
| Cloud effects/templates | No verified parity | Asset licensing, own catalog/service and download/cache lifecycle |

Current REA evidence: `capcut-artifact.json`; class/method inspection is blocked by the missing caller-supplied JADX MCP JAR (`capcut-rea.json`). Full native analysis additionally needs a supported native-analysis provider. No claim is made that every CapCut feature has been discovered or implemented.
