# Primary references behind the recommendations

Checked 19 October 2026. These sources inform the design; the proposed coverage metrics and four bands are this project's method, not an official UN score.

- [OpenAI: Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs). Strict schemas improve format adherence but do not eliminate content mistakes. Explicit null/empty paths and generated enum contracts help avoid forced guesses.
- [OpenAI: Prompting](https://developers.openai.com/api/docs/guides/prompting). Clear task instructions, examples and versioned evaluation support repeatable prompt changes. Our file allowlist is an application design decision.
- [OpenAI: File search](https://developers.openai.com/api/docs/guides/tools-file-search). Retrieval result limits trade token/latency cost against information coverage. We therefore distinguish code-logged searches from evidence completeness.
- [OpenAI: Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching). Repeated prefixes can benefit from caching. Static instructions/vocabulary precede variable data; savings must be measured for the selected model and actual traffic.
- [UNFCCC: Technical guidelines for the national adaptation plan process](https://unfccc.int/topics/adaptation-and-resilience/resources/publications/technical-guidelines-for-the-national-adaptation-plan-process). NAP planning is country driven and non-prescriptive. This supports showing priorities alongside a common documentation comparison rather than claiming all countries need identical sector portfolios.
- [UN Statistics: 2025 SDG progress assessment technical note](https://unstats.un.org/sdgs/files/report/2025/Technical_Note_for_Progress_Assessment_2025.pdf). SDG progress assessment uses indicator series, targets and explicit data-availability rules. Document extraction alone does not provide that outcome evidence; the proposed arrows describe documentation change only.
- [UNDRR: Sendai Framework](https://www.undrr.org/implementing-sendai-framework/what-sendai-framework). The disaster-risk frame extends beyond climate hazards. Keep all-hazard disaster records distinct from climate attribution and avoid treating NDC/NAP completeness as a full national DRR assessment.

No vendor pricing, universal token limit or guaranteed accuracy/cost reduction is assumed. Re-check model capabilities and limits during implementation. The current runtime source archive is the authority for application behavior; external documentation does not override what that code actually does.
