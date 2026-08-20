# VeeamStorageTools

Static browser helper for collecting Veeam Backup & Replication data and
turning the collected output into an XLSX workbook.

The workflow mirrors the StorageTools web helper:

1. Open `web/index.html`.
2. Enter the customer, VBR label, collection window, and output directory.
3. Download the generated Windows `.cmd` file.
4. Run the `.cmd` from an elevated Command Prompt on the VBR server, or on a
   Windows host with the Veeam console/PowerShell components installed.
5. Import the generated `.tar` archive back into the browser app.
6. Download the generated spreadsheet.

## What the CMD Collects

The generated CMD embeds `collector/Veeam_Storage_Collector.ps1` and
`collector/Veeam_Inventory_Collector.ps1` as readable PowerShell sections,
writes them to a temporary working directory, runs them, and packages these
files:

- `veeam_collector_report.txt` - canonical human-readable collector report.
- `veeam_collector_report.json` - structured collector report for browser import.
- `veeam_inventory.json` - VBR configuration inventory for browser import.
- `veeam_collector_console.log` - progress and console output.
- `veeam_collector_errors.log` - warnings/errors from the collector process.
- `veeam_collector_debug.log` - optional, only when debug is enabled.
- `manifest.txt` - customer/label/window/source metadata.
- `Veeam_Storage_Collector.ps1` - exact collector source used for the run.
- `Veeam_Inventory_Collector.ps1` - exact inventory collector source used for
  the run.

The PowerShell collector is a collection-focused fork of
`blackcarburning/Veeam_Log_Collector` at commit
`edc21d5757cdd9773e356b44513cb72e92dad5c7`. The Veeam query/reporting logic is
kept intact, while email delivery, SMTP settings, report-retention cleanup, and
other mail-side effects have been removed.

## Notes

- Only Windows `.cmd` generation is provided because VBR collection runs on
  Windows.
- The CMD prefers `pwsh.exe` when present and falls back to Windows PowerShell.
- The collector does not call `Export-VBRLogs`; it collects the same report
  content used by the existing Unison Veeam analysis flow.
- Spreadsheet generation happens locally in the browser. No archive data is sent
  to a server by the web page.
- The browser prefers `veeam_collector_report.json` and `veeam_inventory.json`
  when present, and falls back to parsing the older human-readable text report.

## Maintenance

After editing `collector/Veeam_Storage_Collector.ps1`, rebuild the self-contained
web page. The generated CMD will include the collector as readable embedded
PowerShell, not as a base64 payload:

```bash
node scripts/build_web.js
```
