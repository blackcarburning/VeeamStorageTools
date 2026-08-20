# VeeamStorageTools

Self-contained browser helper for Veeam Backup & Replication inventory reports.

## Workflow

1. Open `index.html` in a modern browser.
2. Enter the VBR server name, audit window, output directory, and JSON filename.
3. Download the generated Windows `.cmd` file.
4. Run the `.cmd` on a Windows host with PowerShell 7 and the Veeam Backup PowerShell module installed.
5. Import the generated `veeam_inventory.json` file back into `index.html`.
6. Download the generated `.docx` inventory report.

## Collector

The generated CMD embeds the supplied working PowerShell collector unchanged as `veeam_inv_json.ps1` and runs it with the configured parameters.

Collector SHA256 from the supplied attachment:

```text
5e642a100cece55a7057323fdf6a589a2823a263df0ba3fbeea6c87391461156
```

## Notes

- The browser app is static and has no backend.
- JSON import and DOCX generation happen locally in the browser.
- The report structure mirrors the supplied `veeam_report.py` output: title page, environment overview, executive summary, infrastructure, credentials, jobs, retention/GFS, Linux components, warnings, audit extract, and appendix.
- DOCX output is generated directly by `index.html`; Python and `python-docx` are no longer required for report creation.
