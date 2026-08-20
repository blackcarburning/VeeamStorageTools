# VeeamStorageTools

Self-contained browser helper for Veeam Backup & Replication job configuration reports.

Current version: `0.3.0`

## Workflow

1. Open `index.html` in a modern browser or use the OpenClaw dashboard route.
2. Enter the customer name, optional Veeam job filter, output directory, and output text filename.
3. Download the generated Windows `.cmd` file.
4. Run the `.cmd` on the Veeam Backup & Replication server.
5. Import the generated `veeam_job_report.txt` output back into the browser page.
6. Review the parsed jobs and download the generated `.docx` report.

## Collector

The generated CMD embeds the supplied working `job_query_veeam_13_ps7.ps1` collector as readable PowerShell text. The collector is written to disk and run with the configured `-JobName` value. It collects per-job repository, retention, schedule, GFS, tags, includes, and excludes from the human-readable text output.

## Report

The DOCX is generated locally in the browser. It includes:

- Executive summary
- Backup jobs
- Schedule details
- Retention and GFS settings
- Scope includes/excludes
- Repository summary
- Raw collector output appendix

All generated Word tables are left justified and use fixed-width landscape layout to avoid flowing off the right side of the page.

## Notes

- The app is static and has no backend.
- Text import and DOCX generation happen locally in the browser.
- Python, `python-docx`, XLSX generation, and the older JSON inventory flow are no longer required.
