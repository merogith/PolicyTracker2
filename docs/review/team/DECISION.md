# Implementation decision

20 October 2026 | Review plan 4.2 | Proposed, not activated.

Read the [final upgrade plan](FINAL-UPGRADE-PLAN.md). It is the controlling plan for the pipeline, OCR, storage, scoring integration and approved dashboard. The earlier decision document is preserved in `docs/archive/policy-tracker-review-4.1.zip`.

The recommended change is systematic source-packet extraction across all topics, followed by conservative claim organization. Preserve two principal model stages, automatic publication, the 16-domain / 64-topic system, scoring method 4.0 and presentation 4.1. Add targeted local OCR and conditional image recovery without a human validation queue.

The final plan specifies the implementation order, automatic acceptance checks, exact UI priorities, initial settings and proposed production configuration structure. The [pipeline guide](PIPELINE.md) is its shorter technical companion. The [dashboard preview](../ui-scoring/dashboard.html) remains the visual reference.

The v3 machine configuration, prompt templates, contracts and synthetic request examples are retained as reference inputs to revise during phase 1. They still contain older operational assumptions and must not be treated as the exact final runtime request set. No application migration is activated by these planning documents.
