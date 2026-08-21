# VeeamStorageTools

Self-contained offline browser tool for Veeam Backup & Replication reporting.

Current version: `0.7.5` (VBR v13 focused)

## What changed for VBR v13

- Collector/runtime guidance updated for Veeam console environments (Windows PowerShell 5.1 first; PowerShell 7 optional when the Veeam module is available).
- Uses guarded cmdlet discovery (`Get-VBRCommand -V130` when available plus module command discovery).
- Adds section diagnostics so unsupported/edition-limited cmdlets produce per-section warnings instead of aborting the full report.
- Adds an explicit reference index (IDs/object references) for jobs, backups, repositories, servers, proxies, protection groups, credentials metadata, tape entities, and malware events when available.
- Expands read-only inventory coverage across infrastructure, repositories/SOBR/capacity, jobs/job configuration, sessions, restore-point summaries, licensing, security, tape, and compatibility metadata.

## Workflow

1. Open `index.html` in a modern browser.
2. Enter customer/server/filter/audit/output settings.
3. Download the generated Windows `.cmd` wrapper.
4. Run the `.cmd` on the VBR server.
5. Import generated `veeam_combined_report.json` (or text sidecar) into the page.
6. Review jobs + diagnostics + summary sections and optionally download the DOCX.

## Safety and privacy

- Collector is **read-only**: no start/stop/set/add/remove/install/update/sync operations are used for inventory collection.
- Bounded/high-volume queries are constrained by `Audit days` and explicit limits for sessions/task sessions/restore point summaries.
- Credentials are metadata-only inventory (no passwords/private keys/tokens).
- Report excludes secret material by design (only IDs/names/types/status/non-secret metadata).

## Coverage highlights

Best-effort, cmdlet-gated collection includes:

- Server/module/compatibility metadata and command discovery
- Infrastructure and managed servers
- Repositories, SOBRs, performance/capacity extents, and capacity snapshots
- Job families and job configuration (retention, schedule, GFS, scope)
- Computer backup jobs (for Agent-policy direction in v13), backup copy, SureBackup, tape jobs
- Recent backup/task sessions (bounded)
- Backup/restore-point summary rows (bounded)
- Licensing summaries
- Security/malware/compliance/certificate metadata when supported
- Tape infrastructure metadata when supported

## Limitations

- Output is edition/license/workload dependent; unsupported cmdlets are reported in section diagnostics.
- Some optional sections require feature-specific cmdlets present on the target VBR server.
- Final validation still requires execution against a live VBR v13 environment with representative licensed features.

## Report generation

DOCX is generated locally in-browser with fixed-width landscape tables and truncation controls for large datasets.
