# Current-runtime reference

This folder is a **review snapshot, not application configuration**. The application loads the original source files, not these copies.

- [Runtime input guide](../RUNTIME-INPUTS.md): what the current models actually receive.
- [Manifest](manifest.json): original paths, roles, SHA-256 hashes and limits of the snapshot.
- `source/`: exact byte copies of 15 current source/config files.
- `rendered/`: eight actual-builder prompt exports; filenames identify seed taxonomy and synthetic data. No real country run is represented.
- [Offline exporter](export-reference.cjs): regenerates this snapshot from the checkout with Node 24+. No database, network or LLM call.

The old runtime uses prompt `2026-10-18.4` and rubric `2.0.2`. The recommended four-band system in the parent package requires implementation. Do not substitute the proposed prompts into the old schema without completing that integration.
