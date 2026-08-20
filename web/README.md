# Web Helper

`index.html` is a self-contained static web application. The generated CMD
embeds the current collection and inventory PowerShell scripts as readable
marked sections, so it can run without downloading code from GitHub.

New collection archives include `veeam_collector_report.json` and
`veeam_inventory.json`. The browser imports those JSON files first and falls
back to the older text report parser when they are absent.

Open `index.html` in a browser or host it with any static web server.
