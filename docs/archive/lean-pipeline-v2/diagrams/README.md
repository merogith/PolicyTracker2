# Pipeline diagrams

Recommended specification v2.0.0. These diagrams describe the proposed pipeline; they do not change the running application.

- **pipeline.drawio**: editable, uncompressed draw.io XML with two pages: Simple overview and Engineering flow. Open locally in diagrams.net/draw.io.
- **pipeline-simple.svg**: 1650 × 590 standalone overview. Seven steps identify the two LLM roles and the work handled by code.
- **pipeline-detailed.svg**: 1780 × 1740 standalone engineering flow. Includes source checks, records, pooling, identity checks, source-scoped bands, configuration and automatic snapshots.

The solid arrows show processing order. Dashed arrows show configuration inputs. Stage 2 receives sourced records, not PDFs. Pooling and band calculation do not call an LLM. No human acceptance gate is part of either flow.

SVG files scale without losing resolution. The draw.io file retains editable text, shapes and connections; edits in draw.io do not automatically regenerate the SVG previews. Keep the diagram and previews in the same specification version when changing the process.
