# Preserved implementation baseline

Captured 19 October 2026 before the proposed v3 changes. These files are reference material and **must never be added to model context by a folder scan**.

The 20 October packaging check found later workspace changes. These archives remain the exact 19 October baseline; they are not a fresh export of the current application. `../PACK-MANIFEST.json` lists the paths that now differ. Archive hashes continue to be verified, and no later workspace changes are overwritten or copied into the frozen baseline. Implementation findings must be checked against the latest source before activation.

- [application-before-update.zip](application-before-update.zip): 108 byte-exact files covering application source, UI, workers, schemas, prompts, scoring, taxonomy seed, Prisma, scripts, package metadata and current documentation.
- [application-manifest.json](application-manifest.json): original repository-relative paths, SHA-256 hashes and byte counts.
- [current-runtime.zip](current-runtime.zip): the earlier focused runtime snapshot, its exact source/config copies, eight rendered prompt examples and offline export script.

The rendered extraction/retag prompts use the repository seed taxonomy and synthetic document metadata. They are outputs of the real builders, not captured production requests. Current database taxonomy edits and environment model values could differ. No .env, credentials, database or uploaded policy PDFs are included.

The PDF sourcebook prints the real prompt builder and readable prompt examples, then clearly separates proposed v3 templates. PDF wrapping is for reading; ZIP bytes and hashes are the preservation authority.

The previous v2 review pack is preserved at `docs/archive/lean-pipeline-v2.zip`. It is historical design, not current runtime and not the proposed v3 input bundle.
