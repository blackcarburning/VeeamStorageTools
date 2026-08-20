# VeeamStorageTools

Self-contained browser helper for Veeam Backup & Replication job configuration reports.

Current version: `0.4.0`

## Workflow

1. Open `index.html` in a modern browser or use the OpenClaw dashboard route.
2. Enter the customer name, VBR server, optional Veeam job filter, audit options, output directory, JSON filename, and text sidecar filename.
3. Download the generated Windows `.cmd` file.
4. Run the `.cmd` on the Veeam Backup & Replication server.
5. Import the generated `veeam_combined_report.json` output back into the browser page. The generated `veeam_job_report.txt` sidecar can also be imported.
6. Review the parsed jobs and download the generated `.docx` report.

## Collector

The generated CMD embeds a merged readable PowerShell collector. It keeps the original `index.html` inventory queries and adds the newer `veeam_tools.html` job configuration queries for repository, retention, schedule, GFS, tags, includes, and excludes.

The collector writes:

- `veeam_combined_report.json` with the original inventory sections plus enhanced `JobConfiguration`, `JobRetentionPolicies`, and `JobGFSSettings`.
- `veeam_job_report.txt` in the human-readable job format used by the newer viewer/parser.

## Report

The DOCX is generated locally in the browser. It includes:

- Executive summary
- Backup jobs
- Schedule details
- Retention and GFS settings
- Scope includes/excludes
- Repository summary
- Original inventory query sections when combined JSON is imported
- Raw collector output appendix

All generated Word tables are left justified and use fixed-width landscape layout to avoid flowing off the right side of the page.

## Notes

- The app is static and has no backend.
- Combined JSON/text import and DOCX generation happen locally in the browser.
- Python, `python-docx`, and XLSX generation are no longer required.
