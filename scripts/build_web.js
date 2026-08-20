const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const collectorPath = path.join(root, 'collector', 'Veeam_Storage_Collector.ps1');
const inventoryPath = path.join(root, 'collector', 'Veeam_Inventory_Collector.ps1');
const outputPath = path.join(root, 'web', 'index.html');

const collectorSource = fs.readFileSync(collectorPath, 'utf8').replace(/^\uFEFF/, '');
const collectorCmdSource = collectorSource.replace(/\r?\n/g, '\r\n').replace(/(\r\n)+$/, '');
const collectorBytes = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(collectorCmdSource, 'utf8')]);
const collectorSha256 = crypto.createHash('sha256').update(collectorBytes).digest('hex');
const inventorySource = fs.readFileSync(inventoryPath, 'utf8').replace(/^\uFEFF/, '');
const inventoryCmdSource = inventorySource.replace(/\r?\n/g, '\r\n').replace(/(\r\n)+$/, '');
const inventoryBytes = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(inventoryCmdSource, 'utf8')]);
const inventorySha256 = crypto.createHash('sha256').update(inventoryBytes).digest('hex');
const sourceCommit = 'edc21d5757cdd9773e356b44513cb72e92dad5c7';

const html = String.raw`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>VeeamStorageTools - VBR Collection Helper</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Segoe UI,Tahoma,Arial,sans-serif;font-size:14px;background:#eef2f7;color:#172033}
header{background:#18344f;color:#fff;padding:14px 24px;display:flex;gap:14px;align-items:center}
header .logo{font-size:22px;font-weight:700}
header .sub{font-size:12px;color:#b9d9f2;margin-top:2px}
nav{background:#fff;border-bottom:2px solid #2c6fa6;display:flex;padding:0 20px;gap:2px;overflow-x:auto}
nav button{padding:11px 18px;border:none;background:none;cursor:pointer;font-size:13px;font-weight:600;color:#4b5563;border-bottom:3px solid transparent;margin-bottom:-2px;white-space:nowrap}
nav button.active{color:#2c6fa6;border-bottom-color:#2c6fa6}
main{max-width:1160px;margin:0 auto;padding:20px}
.tab{display:none}.tab.active{display:block}
.card{background:#fff;border-radius:8px;padding:22px;margin-bottom:18px;box-shadow:0 1px 3px rgba(0,0,0,.1)}
.card h2{font-size:15px;color:#18344f;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #e5eaf0}
.card h3{font-size:13px;color:#374151;margin:14px 0 8px}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(max-width:720px){.form-grid{grid-template-columns:1fr}}
.fg{display:flex;flex-direction:column;gap:4px}.fg.full{grid-column:1/-1}
label{font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.35px}
input[type=text],input[type=number]{padding:8px 10px;border:1px solid #d1d5db;border-radius:5px;font-size:13px;font-family:inherit;width:100%}
input:focus{outline:2px solid #2c6fa6;border-color:#2c6fa6}
.hint{font-size:11px;color:#6b7280;line-height:1.4}
.check-row{display:flex;align-items:center;gap:8px;min-height:35px}
.actions{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}
.btn{padding:9px 16px;border:none;border-radius:5px;cursor:pointer;font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:6px}
.btn:disabled{opacity:.5;cursor:default}.btn-primary{background:#2c6fa6;color:#fff}.btn-primary:not(:disabled):hover{background:#1f557f}
.btn-success{background:#198754;color:#fff}.btn-success:not(:disabled):hover{background:#146c43}
.btn-gray{background:#687383;color:#fff}.btn-gray:not(:disabled):hover{background:#4b5563}
.alert{padding:11px 14px;border-radius:6px;margin-bottom:14px;font-size:13px;line-height:1.55}
.alert-info{background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a5f}.alert-success{background:#f0fdf4;border:1px solid #86efac;color:#14532d}
.alert-warn{background:#fef3c7;border:1px solid #fde68a;color:#78350f}.alert-danger{background:#fee2e2;border:1px solid #fca5a5;color:#7f1d1d}
code,pre{background:#f3f4f6;border-radius:4px;font-family:Consolas,"Courier New",monospace;font-size:12px}
code{padding:1px 5px}pre{padding:12px;overflow-x:auto;line-height:1.5}
.drop-zone{border:2px dashed #d1d5db;border-radius:8px;padding:28px 20px;text-align:center;cursor:pointer;background:#fafafa;transition:border-color .2s,background .2s}
.drop-zone:hover,.drop-zone.drag-over{border-color:#2c6fa6;background:#eff6ff}
.drop-zone p{color:#6b7280;font-size:13px;margin-bottom:6px}
.stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:12px 0 16px}
.stat-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px;text-align:center}
.stat-num{font-size:24px;font-weight:700;color:#18344f}.stat-lbl{font-size:11px;color:#6b7280;margin-top:2px}
.tbl-wrap{overflow-x:auto;border-radius:6px;border:1px solid #e5e7eb}
table{width:100%;border-collapse:collapse;font-size:12.5px}thead th{background:#18344f;color:#fff;padding:8px 10px;text-align:left;white-space:nowrap}
tbody td{padding:7px 10px;border-bottom:1px solid #f1f1f1;vertical-align:top}tbody tr:hover td{background:#f9fafb}
footer{text-align:center;padding:14px;font-size:12px;color:#9ca3af;margin-top:8px}
#statusBar{position:fixed;bottom:0;left:0;right:0;background:#18344f;color:#fff;padding:7px 16px;font-size:13px;display:none;z-index:100}
</style>
</head>
<body>
<header>
  <div class="logo">VeeamStorageTools</div>
  <div><div style="font-size:15px;font-weight:600">Veeam Backup &amp; Replication Collection Helper</div><div class="sub">Generates Windows CMD collectors - imports TAR archives - builds XLSX reports locally</div></div>
</header>
<nav>
  <button id="btn-setup" class="active" onclick="showTab('setup')">1 - Setup</button>
  <button id="btn-generate" onclick="showTab('generate')">2 - Generate CMD</button>
  <button id="btn-import" onclick="showTab('import')">3 - Import Results</button>
  <button id="btn-report" onclick="showTab('report')">4 - Spreadsheet</button>
</nav>
<main>
<div id="tab-setup" class="tab active">
  <div class="card">
    <h2>Collection Configuration</h2>
    <div class="form-grid">
      <div class="fg"><label>Customer Name</label><input type="text" id="customerName" placeholder="Acme Corp"></div>
      <div class="fg"><label>VBR Server Label</label><input type="text" id="vbrLabel" placeholder="VBR01"><span class="hint">Used only for filenames and manifest metadata.</span></div>
      <div class="fg"><label>Collection Window (hours)</label><input type="number" id="hours" min="1" max="8760" value="24"><span class="hint">Passed to the collector's <code>-Hours</code> parameter.</span></div>
      <div class="fg"><label>Windows Output Directory</label><input type="text" id="outputDir" value="VeeamStorageTools_Output"><span class="hint">Relative paths resolve from the folder where the CMD is run. Drive-root and UNC paths are supported.</span></div>
      <div class="fg"><label>Filter</label><div class="check-row"><input type="checkbox" id="onlyFailures"><span>Only include failed, warning, error, stopped, or running sessions</span></div></div>
      <div class="fg"><label>Diagnostics</label><div class="check-row"><input type="checkbox" id="collectorDebug"><span>Include collector debug log in the archive</span></div></div>
    </div>
    <div class="actions">
      <button class="btn btn-primary" onclick="saveConfig()">Save to Browser</button>
      <button class="btn btn-gray" onclick="loadConfig()">Reload Saved</button>
    </div>
    <div id="configStatus" class="alert alert-success" style="display:none"></div>
  </div>
  <div class="alert alert-info"><strong>Workflow:</strong> create the CMD, run it from an elevated command prompt on the Veeam Backup &amp; Replication server, import the generated TAR archive here, then download the XLSX workbook.</div>
</div>
<div id="tab-generate" class="tab">
  <div class="alert alert-warn"><strong>Run location:</strong> VBR PowerShell collection must run on a VBR server or a Windows host with the Veeam console/PowerShell components installed. No IBM Storage Protect credentials or DSM tools are used.</div>
  <div class="card">
    <h2>Generate Collection Command</h2>
    <p style="color:#555;margin-bottom:12px;font-size:13px">The downloaded CMD contains the Veeam collector sources embedded in the file. It writes local PowerShell scripts, runs the Veeam collection and inventory queries, and packages text, JSON, logs, manifest, and source files into a TAR archive.</p>
    <div class="stat-grid">
      <div class="stat-box"><div class="stat-num">CMD</div><div class="stat-lbl">Windows only</div></div>
      <div class="stat-box"><div class="stat-num">TAR</div><div class="stat-lbl">Archive output</div></div>
      <div class="stat-box"><div class="stat-num">XLSX</div><div class="stat-lbl">Browser report</div></div>
    </div>
    <div class="actions"><button class="btn btn-primary" onclick="downloadCmd()">Download Veeam CMD</button></div>
  </div>
  <div class="card">
    <h2>Usage Notes</h2>
    <ul style="font-size:13px;line-height:1.8;color:#374151;padding-left:18px">
      <li>Run the CMD from an elevated Windows Command Prompt on the VBR server.</li>
      <li>The CMD prefers <code>pwsh.exe</code> when available and falls back to Windows PowerShell.</li>
      <li>The collector does not send email, does not call <code>Export-VBRLogs</code>, and does not clean old reports.</li>
      <li>Native <code>tar.exe</code> is used when available; otherwise the CMD uses an embedded PowerShell TAR writer.</li>
      <li>The browser prefers structured JSON output and falls back to the human-readable collector report used by the Unison analysis flow.</li>
    </ul>
  </div>
</div>
<div id="tab-import" class="tab">
  <div class="card">
    <h2>Import Collection Archive</h2>
    <div id="dropZone" class="drop-zone" onclick="document.getElementById('fileInput').click()">
      <p>Select the <code>.tar</code> archive produced by the generated CMD.</p>
      <p>Individual <code>.json</code>, <code>.txt</code>, or <code>.log</code> files can be imported for troubleshooting.</p>
      <input type="file" id="fileInput" multiple accept=".tar,.json,.txt,.log" style="display:none" onchange="handleFiles(this.files)">
    </div>
    <div class="actions"><button class="btn btn-gray" onclick="clearImport()">Clear Import</button></div>
    <div id="importSummary" class="alert alert-info">No collection imported yet.</div>
  </div>
  <div class="card"><h2>Imported Data</h2><div id="importStats" class="stat-grid"></div><div id="importTables"></div></div>
</div>
<div id="tab-report" class="tab">
  <div class="card">
    <h2>Generate XLSX Spreadsheet</h2>
    <div id="reportStats" class="stat-grid"></div>
    <div class="actions"><button class="btn btn-success" id="btnReport" onclick="generateReport()" disabled>Download XLSX Report</button></div>
    <div id="reportStatus" class="alert alert-info" style="display:none"></div>
  </div>
</div>
</main>
<footer>VeeamStorageTools - collection and spreadsheet generation run locally in the browser.</footer>
<div id="statusBar"></div>
<script>
const COLLECTOR_SOURCE = ${JSON.stringify(collectorCmdSource)};
const INVENTORY_SOURCE = ${JSON.stringify(inventoryCmdSource)};
const COLLECTOR_SHA256 = ${JSON.stringify(collectorSha256)};
const INVENTORY_SHA256 = ${JSON.stringify(inventorySha256)};
const COLLECTOR_SOURCE_REPO = 'blackcarburning/Veeam_Log_Collector';
const COLLECTOR_SOURCE_COMMIT = ${JSON.stringify(sourceCommit)};
const APP_STORAGE_KEY = 'veeamStorageToolsConfigV1';
const STATE = { archive:null, reportText:'', consoleLog:'', errorLog:'', collectorJson:null, inventoryJson:null, parsed:null };

function showTab(id){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active'));
  document.getElementById('tab-'+id).classList.add('active');
  document.getElementById('btn-'+id).classList.add('active');
}
function showStatus(msg){const bar=document.getElementById('statusBar');bar.textContent=msg;bar.style.display='block';clearTimeout(showStatus.t);showStatus.t=setTimeout(()=>bar.style.display='none',3500);}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function readConfig(){return{customerName:val('customerName'),vbrLabel:val('vbrLabel'),hours:Math.min(8760,Math.max(1,parseInt(val('hours')||'24',10)||24)),outputDir:val('outputDir')||'VeeamStorageTools_Output',onlyFailures:chk('onlyFailures'),collectorDebug:chk('collectorDebug')};}
function val(id){return document.getElementById(id).value.trim();}
function chk(id){return document.getElementById(id).checked;}
function setVal(id,v){document.getElementById(id).value=v??'';}
function setChk(id,v){document.getElementById(id).checked=!!v;}
function saveConfig(){localStorage.setItem(APP_STORAGE_KEY,JSON.stringify(readConfig()));flashConfig('Configuration saved.');}
function loadConfig(){const raw=localStorage.getItem(APP_STORAGE_KEY);if(!raw){flashConfig('No saved configuration found.','alert-info');return;}try{const c=JSON.parse(raw);setVal('customerName',c.customerName);setVal('vbrLabel',c.vbrLabel);setVal('hours',c.hours||24);setVal('outputDir',c.outputDir||'VeeamStorageTools_Output');setChk('onlyFailures',c.onlyFailures);setChk('collectorDebug',c.collectorDebug);flashConfig('Configuration loaded.');}catch{flashConfig('Saved configuration could not be read.','alert-danger');}}
function flashConfig(msg,cls='alert-success'){const el=document.getElementById('configStatus');el.className='alert '+cls;el.textContent=msg;el.style.display='block';}
function safeLabel(v,fallback){const s=String(v||fallback||'VBR').replace(/[^A-Za-z0-9._-]/g,'_').replace(/_+/g,'_');return s||fallback;}
function cmdSafe(v){return String(v??'').replace(/[\r\n]/g,' ').replace(/[&<>|^%"()]/g,'_');}
function psCmd(s){return '"' + s.replace(/"/g,'\\"') + '"';}

function generateCmdContent(){
  const cfg=readConfig(), now=new Date().toISOString().slice(0,19).replace('T',' ');
  const server=safeLabel(cfg.vbrLabel,'VBR'), customer=cmdSafe(cfg.customerName||'not set'), label=cmdSafe(cfg.vbrLabel||'not set');
  const onlyFailuresFlag=cfg.onlyFailures?' -OnlyFailures':'', debugFlag=cfg.collectorDebug?' -CollectorDebug':'';
  const collectorStart='@@VEEAM_STORAGE_COLLECTOR_PS1_BEGIN@@', collectorEnd='@@VEEAM_STORAGE_COLLECTOR_PS1_END@@';
  const inventoryStart='@@VEEAM_STORAGE_INVENTORY_PS1_BEGIN@@', inventoryEnd='@@VEEAM_STORAGE_INVENTORY_PS1_END@@';
  const tarStart='@@VEEAM_STORAGE_TAR_FALLBACK_PS1_BEGIN@@', tarEnd='@@VEEAM_STORAGE_TAR_FALLBACK_PS1_END@@';
  const tarFallback = [
    '$w=$env:VST_WORKDIR;$t=$env:VST_ARCHIVE_TMP',
    'if(-not $w -or -not $t){exit 1}',
    '$A=[System.Text.Encoding]::ASCII',
    '$S=[System.IO.File]::Open($t,[System.IO.FileMode]::Create,[System.IO.FileAccess]::Write)',
    'try{foreach($f in(Get-ChildItem -LiteralPath $w -File|Sort-Object Name)){',
    '$nm=$f.Name;if($nm.Length -gt 100){$nm=$nm.Substring(0,100)}',
    '$data=[System.IO.File]::ReadAllBytes($f.FullName);$sz=$data.Length;$h=[byte[]]::new(512)',
    '$nb=$A.GetBytes($nm);[Array]::Copy($nb,0,$h,0,$nb.Length)',
    '$so=[Convert]::ToString($sz,8).PadLeft(11,\'0\');$bs=$A.GetBytes($so);[Array]::Copy($bs,0,$h,124,11)',
    '$h[156]=48;$h[257]=117;$h[258]=115;$h[259]=116;$h[260]=97;$h[261]=114',
    'for($i=148;$i -lt 156;$i++){$h[$i]=32};$cs=0;foreach($b in $h){$cs+=[int]$b}',
    '$co=[Convert]::ToString($cs,8).PadLeft(6,\'0\');$bc=$A.GetBytes($co);[Array]::Copy($bc,0,$h,148,6);$h[154]=0;$h[155]=32',
    '$S.Write($h,0,512);if($sz -gt 0){$p=[int][Math]::Ceiling($sz/512)*512;$buf=[byte[]]::new($p);[Array]::Copy($data,$buf,$sz);$S.Write($buf,0,$p)}}',
    '$z=[byte[]]::new(1024);$S.Write($z,0,1024);$S.Close()}catch{try{$S.Close()}catch{};if(Test-Path $t){Remove-Item $t -Force -EA SilentlyContinue};exit 1}'
  ].join('\r\n');
  const extractSectionCmd="$ErrorActionPreference='Stop';$self=$env:VST_SELF;$out=$env:VST_SECTION_OUT;$start=$env:VST_SECTION_START;$end=$env:VST_SECTION_END;$text=[IO.File]::ReadAllText($self,[System.Text.Encoding]::UTF8);$s=$text.LastIndexOf($start);$e=if($s -ge 0){$text.IndexOf($end,$s)}else{-1};if($s -lt 0 -or $e -lt 0){throw 'Embedded section markers not found'};$s+=$start.Length;$crlf=[string][char]13+[string][char]10;if($text.Substring($s,[Math]::Min(2,$text.Length-$s)) -eq $crlf){$s+=2}elseif($s -lt $text.Length -and $text[$s] -eq [char]10){$s+=1};$payload=$text.Substring($s,$e-$s).TrimEnd([char]13,[char]10);[IO.File]::WriteAllText($out,$payload,[System.Text.UTF8Encoding]::new($true))";
  const stampCmd="$d=Get-Date;$u=$d.ToUniversalTime();[Console]::WriteLine($d.ToString('yyyyMMdd_HHmmss')+'|'+$u.ToString('yyyy-MM-ddTHH:mm:ssZ'))";
  const lines=[];
  lines.push('@echo off','SETLOCAL EnableExtensions','REM =================================================================','REM VeeamStorageTools - VBR collection script','REM Generated by VeeamStorageTools Web Helper','REM Customer  : '+customer,'REM VBR Label : '+label,'REM Generated : '+now+' UTC','REM =================================================================','');
  lines.push('SET "HOURS='+cfg.hours+'"','SET "OUTDIR_RAW='+cmdSafe(cfg.outputDir)+'"','SET "LAUNCH_DIR=%CD%"','SET "OUTDIR=%OUTDIR_RAW%"','IF NOT "%OUTDIR_RAW:~1,1%"==":" IF NOT "%OUTDIR_RAW:~0,2%"=="\\\\" SET "OUTDIR=%LAUNCH_DIR%\\%OUTDIR_RAW%"','IF NOT EXIST "%OUTDIR%" MKDIR "%OUTDIR%"','IF NOT EXIST "%OUTDIR%" (','  echo [FATAL] Unable to create output directory: %OUTDIR% 1>&2','  EXIT /B 1',')','');
  lines.push('SET "WORKDIR=%OUTDIR%\\.veeamstorage_%RANDOM%_%RANDOM%"','IF NOT EXIST "%WORKDIR%" MKDIR "%WORKDIR%"','IF NOT EXIST "%WORKDIR%" (','  echo [FATAL] Unable to create working directory: %WORKDIR% 1>&2','  EXIT /B 1',')','SET "SELF=%~f0"','SET "COLLECTOR_PS1=%WORKDIR%\\Veeam_Storage_Collector.ps1"','SET "INVENTORY_PS1=%WORKDIR%\\Veeam_Inventory_Collector.ps1"','SET "TAR_FALLBACK_PS1=%WORKDIR%\\Write-TarArchive.ps1"','SET "REPORT=%WORKDIR%\\veeam_collector_report.txt"','SET "REPORT_JSON=%WORKDIR%\\veeam_collector_report.json"','SET "INVENTORY_JSON=%WORKDIR%\\veeam_inventory.json"','SET "CONSOLE_LOG=%WORKDIR%\\veeam_collector_console.log"','SET "ERROR_LOG=%WORKDIR%\\veeam_collector_errors.log"','SET "DEBUG_LOG=%WORKDIR%\\veeam_collector_debug.log"','');
  lines.push('echo Writing embedded PowerShell collector source...','SET "VST_SELF=%SELF%"','SET "VST_SECTION_START='+collectorStart+'"','SET "VST_SECTION_END='+collectorEnd+'"','SET "VST_SECTION_OUT=%COLLECTOR_PS1%"','powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command '+psCmd(extractSectionCmd),'SET EXTRACT_RC=%ERRORLEVEL%','IF NOT %EXTRACT_RC%==0 (','  echo [FATAL] Unable to extract embedded collector source. 1>&2','  EXIT /B %EXTRACT_RC%',')','');
  lines.push('echo Writing embedded PowerShell inventory collector source...','SET "VST_SECTION_START='+inventoryStart+'"','SET "VST_SECTION_END='+inventoryEnd+'"','SET "VST_SECTION_OUT=%INVENTORY_PS1%"','powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command '+psCmd(extractSectionCmd),'SET EXTRACT_RC=%ERRORLEVEL%','IF NOT %EXTRACT_RC%==0 (','  echo [FATAL] Unable to extract embedded inventory collector source. 1>&2','  EXIT /B %EXTRACT_RC%',')','');
  lines.push('echo Writing embedded PowerShell TAR fallback source...','SET "VST_SECTION_START='+tarStart+'"','SET "VST_SECTION_END='+tarEnd+'"','SET "VST_SECTION_OUT=%TAR_FALLBACK_PS1%"','powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command '+psCmd(extractSectionCmd),'SET EXTRACT_RC=%ERRORLEVEL%','SET "VST_SELF="','SET "VST_SECTION_START="','SET "VST_SECTION_END="','SET "VST_SECTION_OUT="','IF NOT %EXTRACT_RC%==0 (','  echo [FATAL] Unable to extract embedded TAR fallback source. 1>&2','  EXIT /B %EXTRACT_RC%',')','');
  lines.push('SET "COLLECTOR_SHA_EXPECTED='+COLLECTOR_SHA256+'"','SET "COLLECTOR_SHA_ACTUAL="','FOR /F "skip=1 tokens=1" %%H IN (\'certutil -hashfile "%COLLECTOR_PS1%" SHA256 ^| findstr /R "^[0-9A-Fa-f][0-9A-Fa-f]"\') DO IF NOT DEFINED COLLECTOR_SHA_ACTUAL SET "COLLECTOR_SHA_ACTUAL=%%H"','IF DEFINED COLLECTOR_SHA_ACTUAL IF /I NOT "%COLLECTOR_SHA_ACTUAL%"=="%COLLECTOR_SHA_EXPECTED%" (','  echo [FATAL] Collector SHA256 verification failed. 1>&2','  EXIT /B 1',')','');
  lines.push('SET "INVENTORY_SHA_EXPECTED='+INVENTORY_SHA256+'"','SET "INVENTORY_SHA_ACTUAL="','FOR /F "skip=1 tokens=1" %%H IN (\'certutil -hashfile "%INVENTORY_PS1%" SHA256 ^| findstr /R "^[0-9A-Fa-f][0-9A-Fa-f]"\') DO IF NOT DEFINED INVENTORY_SHA_ACTUAL SET "INVENTORY_SHA_ACTUAL=%%H"','IF DEFINED INVENTORY_SHA_ACTUAL IF /I NOT "%INVENTORY_SHA_ACTUAL%"=="%INVENTORY_SHA_EXPECTED%" (','  echo [FATAL] Inventory collector SHA256 verification failed. 1>&2','  EXIT /B 1',')','');
  lines.push('SET "PS_EXE=powershell"','where pwsh >NUL 2>&1','IF %ERRORLEVEL%==0 SET "PS_EXE=pwsh"','echo Running Veeam collector with %PS_EXE%...','"%PS_EXE%" -NoProfile -ExecutionPolicy Bypass -File "%COLLECTOR_PS1%" -Hours %HOURS% -OutputPath "%REPORT%" -StructuredOutputPath "%REPORT_JSON%" -DebugLogPath "%DEBUG_LOG%"'+debugFlag+onlyFailuresFlag+' > "%CONSOLE_LOG%" 2> "%ERROR_LOG%"','SET COLLECTOR_RC=%ERRORLEVEL%','IF NOT EXIST "%REPORT%" echo [WARN] Canonical collector report was not created. >> "%ERROR_LOG%"','IF NOT EXIST "%REPORT_JSON%" echo [WARN] Structured collector JSON was not created. >> "%ERROR_LOG%"','');
  lines.push('echo Running Veeam inventory collector with %PS_EXE%...','"%PS_EXE%" -NoProfile -ExecutionPolicy Bypass -File "%INVENTORY_PS1%" -OutputPath "%INVENTORY_JSON%" >> "%CONSOLE_LOG%" 2>> "%ERROR_LOG%"','SET INVENTORY_RC=%ERRORLEVEL%','IF NOT %INVENTORY_RC%==0 echo [WARN] Inventory collector exited with code %INVENTORY_RC%. >> "%ERROR_LOG%"','IF NOT EXIST "%INVENTORY_JSON%" echo [WARN] Inventory JSON was not created. >> "%ERROR_LOG%"','');
  lines.push('FOR /F "tokens=1,2 delims=|" %%A IN (\'powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command '+psCmd(stampCmd)+'\') DO (','  SET "ARCHIVE_TS=%%A"','  SET "GEN_UTC=%%B"',')','IF NOT DEFINED ARCHIVE_TS SET "ARCHIVE_TS=%DATE:/=-%_%TIME::=-%"','IF NOT DEFINED GEN_UTC SET "GEN_UTC=(unavailable)"','SET "ARCHIVE_BASE=VeeamStorageTools_'+server+'_%ARCHIVE_TS%.tar"','SET "ARCHIVE_FILE=%OUTDIR%\\%ARCHIVE_BASE%"','SET "ARCHIVE_TMP=%OUTDIR%\\%ARCHIVE_BASE%.tmp"','');
  lines.push('(','  echo format=VeeamStorageTools-Collection','  echo format_version=2','  echo customer='+customer,'  echo vbr_label='+label,'  echo generated_utc=%GEN_UTC%','  echo hours=%HOURS%','  echo only_failures='+String(cfg.onlyFailures),'  echo collector_debug='+String(cfg.collectorDebug),'  echo collector_source_repo='+COLLECTOR_SOURCE_REPO,'  echo collector_source_commit='+COLLECTOR_SOURCE_COMMIT,'  echo collector_sha256='+COLLECTOR_SHA256,'  echo inventory_sha256='+INVENTORY_SHA256,'  echo collector_rc=%COLLECTOR_RC%','  echo inventory_rc=%INVENTORY_RC%','  echo powershell_exe=%PS_EXE%','  echo report_file=veeam_collector_report.txt','  echo structured_report_file=veeam_collector_report.json','  echo inventory_file=veeam_inventory.json',') > "%WORKDIR%\\manifest.txt"','');
  lines.push('echo Creating archive: %ARCHIVE_FILE%','SET "ARCHIVE_RC=1"','where tar >NUL 2>&1','IF %ERRORLEVEL% NEQ 0 GOTO :TAR_PS','tar -cf "%ARCHIVE_TMP%" -C "%WORKDIR%" .','SET ARCHIVE_RC=%ERRORLEVEL%','GOTO :ARCHIVE_DONE',':TAR_PS','SET "VST_WORKDIR=%WORKDIR%"','SET "VST_ARCHIVE_TMP=%ARCHIVE_TMP%"','powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%TAR_FALLBACK_PS1%"','SET ARCHIVE_RC=%ERRORLEVEL%','SET "VST_WORKDIR="','SET "VST_ARCHIVE_TMP="',':ARCHIVE_DONE','IF %ARCHIVE_RC%==0 IF EXIST "%ARCHIVE_TMP%" MOVE /Y "%ARCHIVE_TMP%" "%ARCHIVE_FILE%" >NUL','IF NOT %ARCHIVE_RC%==0 echo [WARN] Archive creation failed; loose files will remain in %OUTDIR%. 1>&2','');
  lines.push('COPY /Y "%WORKDIR%\\manifest.txt" "%OUTDIR%\\" >NUL 2>&1','COPY /Y "%WORKDIR%\\veeam_collector_report.txt" "%OUTDIR%\\" >NUL 2>&1','IF EXIST "%WORKDIR%\\veeam_collector_report.json" COPY /Y "%WORKDIR%\\veeam_collector_report.json" "%OUTDIR%\\" >NUL 2>&1','IF EXIST "%WORKDIR%\\veeam_inventory.json" COPY /Y "%WORKDIR%\\veeam_inventory.json" "%OUTDIR%\\" >NUL 2>&1','COPY /Y "%WORKDIR%\\veeam_collector_console.log" "%OUTDIR%\\" >NUL 2>&1','COPY /Y "%WORKDIR%\\veeam_collector_errors.log" "%OUTDIR%\\" >NUL 2>&1','IF EXIST "%WORKDIR%\\veeam_collector_debug.log" COPY /Y "%WORKDIR%\\veeam_collector_debug.log" "%OUTDIR%\\" >NUL 2>&1','COPY /Y "%WORKDIR%\\Veeam_Storage_Collector.ps1" "%OUTDIR%\\" >NUL 2>&1','COPY /Y "%WORKDIR%\\Veeam_Inventory_Collector.ps1" "%OUTDIR%\\" >NUL 2>&1','IF EXIST "%ARCHIVE_FILE%" RD /S /Q "%WORKDIR%"','echo =================================================================','IF EXIST "%ARCHIVE_FILE%" echo Collection archive: %ARCHIVE_FILE%','IF NOT EXIST "%ARCHIVE_FILE%" echo Loose files retained in: %OUTDIR%','echo Collector exit code: %COLLECTOR_RC%','echo Inventory exit code: %INVENTORY_RC%','echo Import the TAR archive into VeeamStorageTools to generate the spreadsheet.','echo =================================================================','ENDLOCAL & EXIT /B %COLLECTOR_RC%');
  return [lines.join('\r\n'),collectorStart,COLLECTOR_SOURCE,collectorEnd,inventoryStart,INVENTORY_SOURCE,inventoryEnd,tarStart,tarFallback,tarEnd,''].join('\r\n');
}
function downloadCmd(){const cfg=readConfig();const name='VeeamStorageTools_'+safeLabel(cfg.vbrLabel,'VBR')+'.cmd';downloadText(generateCmdContent(),name,'text/plain');showStatus('Downloaded '+name);}
function downloadText(content,filename,mime){const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);}

const TAR_MAX_ENTRIES=1000,TAR_MAX_FILE_BYTES=100*1024*1024,TAR_MAX_TOTAL_BYTES=300*1024*1024;
function parseTarArchive(buffer){const bytes=new Uint8Array(buffer),files=new Map(),errors=[],warnings=[];function str(start,len){let end=start;while(end<start+len&&bytes[end]!==0)end++;try{return new TextDecoder('utf-8',{fatal:false}).decode(bytes.subarray(start,end));}catch{return new TextDecoder('latin1').decode(bytes.subarray(start,end));}}function oct(start,len){const s=str(start,len).trim().replace(/^0+/,'')||'0';return /^[0-7]+$/.test(s)?parseInt(s,8):-1;}function safe(p){return p&&!p.startsWith('/')&&!/^[A-Za-z]:/.test(p)&&!p.includes('\\')&&!p.split('/').some(x=>x==='..');}let off=0,count=0,total=0,zero=0;while(off+512<=bytes.length){const hdr=bytes.subarray(off,off+512);let all=true;for(let i=0;i<512;i++){if(hdr[i]!==0){all=false;break;}}if(all){if(++zero>=2)break;off+=512;continue;}zero=0;if(count++>=TAR_MAX_ENTRIES){warnings.push('Entry limit reached; remaining entries skipped.');break;}const type=String.fromCharCode(hdr[156]);const name=str(off,100),magic=str(off+257,6),prefix=magic.startsWith('ustar')?str(off+345,155):'';const full=(prefix?prefix.replace(/\/+$/,'')+'/'+name:name).replace(/\\/g,'/');const stripped=full.replace(/^\.\//,'').replace(/^[^/]+\//,'').replace(/^\.\//,'');const size=oct(off+124,12);if(size<0){errors.push('Invalid TAR size at offset '+off);break;}const pad=size>0?Math.ceil(size/512)*512:0;off+=512;if(off+pad>bytes.length){errors.push('Truncated archive at '+stripped);break;}if(type==='0'||type==='\0'||type===''){if(!safe(full))warnings.push('Skipped unsafe path: '+full);else if(size>TAR_MAX_FILE_BYTES)warnings.push('Skipped large file: '+stripped);else{total+=size;if(total>TAR_MAX_TOTAL_BYTES){warnings.push('Total import size limit exceeded.');break;}const base=stripped.split('/').pop();if(base&&!files.has(base))files.set(base,bytes.slice(off,off+size));else if(base)warnings.push('Duplicate filename skipped: '+base);}}off+=pad;}return{files,errors,warnings};}
function decodeBytes(data){if(!data)return null;try{return new TextDecoder('utf-8',{fatal:false}).decode(data).replace(/^\uFEFF/,'');}catch{return null;}}
function parseJsonMaybe(text){if(!text||!String(text).trim())return null;try{return JSON.parse(String(text).replace(/^\uFEFF/,''));}catch{return null;}}
function parseManifest(text){const m={};(text||'').split(/\r?\n/).forEach(line=>{const i=line.indexOf('=');if(i>0)m[line.slice(0,i).trim()]=line.slice(i+1).trim();});return m;}
function handleFiles(list){const files=Array.from(list);const tar=files.find(f=>f.name.toLowerCase().endsWith('.tar'));if(tar){const r=new FileReader();r.onload=e=>handleTarResult(tar.name,parseTarArchive(e.target.result));r.readAsArrayBuffer(tar);return;}let pending=files.length;if(!pending)return;const texts={};files.forEach(f=>{const r=new FileReader();r.onload=e=>{texts[f.name]=e.target.result;if(--pending===0)loadLooseTexts(texts);};r.readAsText(f);});}
function findNamedText(texts,names){const wanted=names.map(n=>n.toLowerCase());for(const [name,text] of Object.entries(texts)){if(wanted.includes(name.toLowerCase()))return text;}return '';}
function classifyJson(name,obj){if(!obj)return null;if(obj.format==='VeeamStorageTools-CollectorReport'||Array.isArray(obj.sessions))return'collector';if(obj.Metadata||obj.BackupServerInfo||obj.Repositories||obj.ScaleOutRepositories||obj.Jobs||obj.ComputerBackupJobs)return'inventory';return name.toLowerCase().includes('inventory')?'inventory':'collector';}
function handleTarResult(filename,result){if(result.errors.length){setImportMessage('Archive import failed: '+result.errors.join('; '),'alert-danger');return;}const report=decodeBytes(result.files.get('veeam_collector_report.txt'))||'';const reportJson=parseJsonMaybe(decodeBytes(result.files.get('veeam_collector_report.json'))||'');const inventoryJson=parseJsonMaybe(decodeBytes(result.files.get('veeam_inventory.json'))||'');const consoleLog=decodeBytes(result.files.get('veeam_collector_console.log'))||'';const errorLog=decodeBytes(result.files.get('veeam_collector_errors.log'))||'';const manifest=parseManifest(decodeBytes(result.files.get('manifest.txt'))||'');STATE.archive={filename,manifest,warnings:result.warnings};STATE.reportText=report;STATE.consoleLog=consoleLog;STATE.errorLog=errorLog;STATE.collectorJson=reportJson;STATE.inventoryJson=inventoryJson;STATE.parsed=parseCollection(report,reportJson,inventoryJson);refreshUI();showStatus('Imported '+filename);}
function loadLooseTexts(texts){const lowered={};Object.entries(texts).forEach(([k,v])=>lowered[k.toLowerCase()]=v);let collectorJson=null,inventoryJson=null;for(const [name,text] of Object.entries(texts)){if(name.toLowerCase().endsWith('.json')){const obj=parseJsonMaybe(text);const kind=classifyJson(name,obj);if(kind==='inventory'&&!inventoryJson)inventoryJson=obj;else if(kind==='collector'&&!collectorJson)collectorJson=obj;}}const report=findNamedText(texts,['veeam_collector_report.txt'])||Object.values(texts).find(t=>/Veeam Collector Report/.test(t))||'';STATE.archive={filename:'loose files',manifest:{},warnings:[]};STATE.reportText=report;STATE.consoleLog=findNamedText(texts,['veeam_collector_console.log']);STATE.errorLog=findNamedText(texts,['veeam_collector_errors.log']);STATE.collectorJson=collectorJson;STATE.inventoryJson=inventoryJson;STATE.parsed=parseCollection(report,collectorJson,inventoryJson);refreshUI();showStatus('Imported loose files.');}
function clearImport(){STATE.archive=null;STATE.reportText='';STATE.consoleLog='';STATE.errorLog='';STATE.collectorJson=null;STATE.inventoryJson=null;STATE.parsed=null;refreshUI();showStatus('Import cleared.');}
function setImportMessage(msg,cls='alert-info'){const el=document.getElementById('importSummary');el.className='alert '+cls;el.textContent=msg;}

function extractSections(text){const sections={};const re=/############### ([^\r\n]+?) BEGIN ###################\r?\n([\s\S]*?)\r?\n############### \1 END ###################/g;let m;while((m=re.exec(text||'')))sections[m[1]]=m[2];return sections;}
function stripSections(text){return(text||'').replace(/############### ([^\r\n]+?) BEGIN ###################\r?\n[\s\S]*?\r?\n############### \1 END ###################/g,'');}
function sliceRow(line,defs){const row={};defs.forEach(d=>row[d[0]]=line.slice(d[1],d[2]).trim());return row;}
function parseFixed(section,defs){const rows=[];(section||'').split(/\r?\n/).forEach(line=>{if(!line.trim()||/^[-\s]+$/.test(line)||line.startsWith('(')||/^Job\s+Type\s+/.test(line)||/^Repository\s+Tier\s+/.test(line))return;const row=sliceRow(line,defs);if(Object.values(row).some(Boolean))rows.push(row);});return rows;}
function parseWhitespaceTable(section){const lines=(section||'').split(/\r?\n/).filter(x=>x.trim());if(lines.length<3||/^No SOBR/.test(lines[0]))return[];const headers=lines[0].trim().split(/\s{2,}/);return lines.slice(2).map(line=>{const parts=line.trim().split(/\s{2,}/);const row={};headers.forEach((h,i)=>row[h]=parts[i]||'');return row;}).filter(r=>Object.values(r).some(Boolean));}
function parseSessions(text){const plain=stripSections(text);const blocks=plain.split(/\r?\n\s*\r?\n/).filter(b=>/^Job\s+:/m.test(b));return blocks.map(block=>{const row={};block.split(/\r?\n/).forEach(line=>{const m=/^([^:]+):\s*(.*)$/.exec(line);if(m)row[m[1].trim().replace(/\s+/g,'_').toLowerCase()]=m[2].trim();});return row;});}
function parseDefinedJobs(section){const lines=(section||'').split(/\r?\n/).filter(x=>x.trim()&&!/^[-\s]+$/.test(x)&&!/^Job\s+Type\s+/.test(x));return lines.map(line=>{const t=line.trim().split(/\s+/);const yn=t.findIndex(x=>/^(Yes|No)$/i.test(x));if(yn>1){const lastResult=t.pop()||'',status=t.pop()||'',time=t.pop()||'',date=t.pop()||'';return{Job:t.slice(0,yn-1).join(' '),Type:t[yn-1]||'',On:t[yn]||'',Schedule:t.slice(yn+1).join(' '),'Last run':(date+' '+time).trim(),Status:status,'Last Result':lastResult};}return sliceRow(line,[['Job',0,38],['Type',39,50],['On',51,54],['Schedule',55,73],['Last run',74,90],['Status',91,102],['Last Result',103,114]]);}).filter(r=>Object.values(r).some(Boolean));}
function parseReport(text){const sections=extractSections(text);const metadata={};const host=/^Host\s+:\s*(.+)$/m.exec(text||'');if(host)metadata.host=host[1].trim();const ps=/^PowerShell\s+:\s*(.+)$/m.exec(text||'');if(ps)metadata.powershell=ps[1].trim();const win=/^Window\s+:\s*(.+)$/m.exec(text||'');if(win)metadata.window=win[1].trim();const jobs=/^Jobs\s+:\s*(\d+)\s+\(Failed:\s*(\d+)\s+Warning:\s*(\d+)\s+Success:\s*(\d+)\s+WithError:\s*(\d+)\)/m.exec(text||'');if(jobs){metadata.jobs=jobs[1];metadata.failed=jobs[2];metadata.warning=jobs[3];metadata.success=jobs[4];metadata.with_error=jobs[5];}
  let capacity=null;try{capacity=sections['Capacity Tier Utilisation']?JSON.parse(sections['Capacity Tier Utilisation']):null;}catch(e){capacity={parse_error:e.message};}
  return{metadata,sections,sessions:parseSessions(text),definedJobs:parseDefinedJobs(sections['Defined Jobs']),repositories:parseFixed(sections['Defined Repository'],[['Repository',0,30],['Tier',31,47],['Parent',48,68],['Status',69,81],['Total',82,93],['Used',94,105],['Free',106,117],['Used %',118,125]]),capacity,offloads:parseWhitespaceTable(sections['SOBR Offload Stats']),inventory:null,inventoryViews:null};
}
function parseStructuredReport(obj){const meta=obj?.metadata||{},sum=obj?.summary||{},win=meta.window||{};return{metadata:{host:meta.host||'',powershell:meta.powershell||'',window:win.hours?('last '+win.hours+' hour(s) ('+(win.start||'')+' to '+(win.end||'')+')'):'',jobs:sum.jobs??'',failed:sum.failed??'',warning:sum.warning??'',success:sum.success??'',with_error:sum.with_error??''},sections:{'VBR Licensing':obj?.raw_sections?.licensing||'','Backup Versions':obj?.raw_sections?.backup_versions||'','SOBR Offload Stats':obj?.raw_sections?.sobr_offload_stats||''},sessions:Array.isArray(obj?.sessions)?obj.sessions:[],definedJobs:Array.isArray(obj?.defined_jobs)?obj.defined_jobs:[],repositories:Array.isArray(obj?.repositories)?obj.repositories:[],capacity:obj?.capacity_tier||null,offloads:parseWhitespaceTable(obj?.raw_sections?.sobr_offload_stats||''),inventory:null,inventoryViews:null};}
function parseCollection(reportText,collectorJson,inventoryJson){const p=collectorJson?parseStructuredReport(collectorJson):parseReport(reportText);p.inventory=inventoryJson||null;p.inventoryViews=inventoryJson?buildInventoryViews(inventoryJson):null;return p;}
function asArray(v){if(!v)return[];return Array.isArray(v)?v:[v];}
function fmtValue(v){if(v==null)return'';if(Array.isArray(v))return v.map(fmtValue).join(', ');if(typeof v==='object')return JSON.stringify(v);return String(v);}
function pickRows(rows,cols){return asArray(rows).map(r=>{const o={};cols.forEach(([out,key])=>o[out]=fmtValue(r?.[key]));return o;});}
function buildInventoryViews(inv){const m=inv?.Metadata||{},b=inv?.BackupServerInfo||{};const overview=[{Metric:'Target Server',Value:fmtValue(m.TargetServer)},{Metric:'Host Name',Value:fmtValue(m.Hostname)},{Metric:'Collected By',Value:fmtValue(m.User)},{Metric:'Generated At',Value:fmtValue(m.GeneratedAt)},{Metric:'VBR Build',Value:fmtValue(b.Build)},{Metric:'Managed Servers',Value:asArray(inv.Servers).length},{Metric:'Repositories',Value:asArray(inv.Repositories).length},{Metric:'Scale-Out Repositories',Value:asArray(inv.ScaleOutRepositories).length},{Metric:'VMware Proxies',Value:asArray(inv.ViProxies).length},{Metric:'Jobs',Value:asArray(inv.Jobs).length},{Metric:'Computer Backup Jobs',Value:asArray(inv.ComputerBackupJobs).length},{Metric:'Warnings',Value:asArray(inv.Warnings).length}];return{overview,servers:pickRows(inv.Servers,[['Name','Name'],['Type','Type'],['Info','Info'],['IsUnavailable','IsUnavailable'],['ApiVersion','ApiVersion']]),repositories:pickRows(inv.Repositories,[['Name','Name'],['Path','Path'],['Host','Host'],['Type','Type'],['Status','Status'],['IsObjectStorageRepository','IsObjectStorageRepository'],['IsLinuxHardened','IsLinuxHardened']]),scaleOutRepositories:pickRows(inv.ScaleOutRepositories,[['Name','Name'],['Perf Extent','Extent'],['UsePerVMBackupFiles','UsePerVMBackupFiles'],['PerformFullWhenExtentOffline','PerformFullWhenExtentOffline'],['Capacity Extent','CapacityExtent'],['Capacity Extents','CapacityExtents'],['EncryptionEnabled','EncryptionEnabled'],['CapacityTierCopyPolicyEnabled','CapacityTierCopyPolicyEnabled'],['CapacityTierMovePolicyEnabled','CapacityTierMovePolicyEnabled']]),immutability:pickRows(inv.RepositoryImmutability,[['RepositoryName','RepositoryName'],['RepositoryType','RepositoryType'],['Settings','Settings']]),viProxies:pickRows(inv.ViProxies,[['Name','Name'],['Type','Type'],['Host','Host'],['TransportMode','TransportMode'],['MaxTasksCount','MaxTasksCount'],['IsDisabled','IsDisabled']]),hvProxies:pickRows(inv.HvProxies,[['Name','Name'],['Type','Type'],['Host','Host'],['IsDisabled','IsDisabled']]),credentials:pickRows(inv.CredentialsMetadataOnly,[['Name','Name'],['Type','Type'],['UserName','UserName'],['Domain','Domain'],['IsReadOnly','IsReadOnly'],['LastModifiedTime','LastModifiedTime']]),jobs:pickRows(inv.Jobs,[['Name','Name'],['TypeToString','TypeToString'],['IsScheduleEnabled','IsScheduleEnabled'],['LatestRunLocal','LatestRunLocal'],['TargetRepositoryId','TargetRepositoryId'],['LogNameMainPart','LogNameMainPart']]),computerBackupJobs:pickRows(inv.ComputerBackupJobs,[['Name','Name'],['BackupObject','BackupObject'],['BackupRepository','BackupRepository'],['RetentionPolicy','RetentionPolicy'],['OSPlatform','OSPlatform'],['Mode','Mode']]),jobProxyMapping:pickRows(inv.JobProxyMapping,[['JobName','JobName'],['ProxyName','ProxyName'],['ProxyRole','ProxyRole']]),retention:pickRows(inv.JobRetentionPolicies,[['JobName','JobName'],['JobType','JobType'],['Source','Source'],['Settings','Settings']]),gfs:pickRows(inv.JobGFSSettings,[['JobName','JobName'],['JobType','JobType'],['Settings','Settings']]),linuxPackages:pickRows(inv.LinuxPackages,[['DisplayName','DisplayName'],['Type','Type']]),warnings:asArray(inv.Warnings).map(x=>({Warning:fmtValue(x)})),cmdlets:pickRows(inv.AvailableVeeamCmdlets,[['Name','Name'],['CommandType','CommandType'],['Version','Version'],['Source','Source']])};}
function refreshUI(){const p=STATE.parsed;const has=!!(p&&(STATE.reportText||STATE.collectorJson||STATE.inventoryJson));document.getElementById('btnReport').disabled=!has;setImportMessage(has?'Collection imported: '+(STATE.archive?.filename||'loose files'):'No collection imported yet.',has?'alert-success':'alert-info');const stats=document.getElementById('importStats');stats.innerHTML=stat('Sessions',p?.sessions.length||0)+stat('Defined jobs',p?.definedJobs.length||0)+stat('Repositories',p?.repositories.length||0)+stat('Capacity rows',p?.capacity?.rows?.length||0)+stat('Inventory jobs',p?.inventoryViews?.jobs?.length||0);document.getElementById('reportStats').innerHTML=stats.innerHTML;renderPreview();}
function stat(label,num){return '<div class="stat-box"><div class="stat-num">'+escapeHtml(num)+'</div><div class="stat-lbl">'+escapeHtml(label)+'</div></div>';}
function renderPreview(){const p=STATE.parsed,el=document.getElementById('importTables');if(!p){el.innerHTML='';return;}el.innerHTML=previewTable('Session Summary',p.sessions.slice(0,20))+previewTable('Defined Repositories',p.repositories.slice(0,20))+(p.inventoryViews?previewTable('Inventory Jobs',p.inventoryViews.jobs.slice(0,20))+previewTable('Scale-Out Repositories',p.inventoryViews.scaleOutRepositories.slice(0,20)):'');}
function previewTable(title,rows){if(!rows.length)return'<h3>'+escapeHtml(title)+'</h3><div class="alert alert-info">No parsed rows.</div>';const cols=Object.keys(rows[0]);return'<h3>'+escapeHtml(title)+' ('+rows.length+')</h3><div class="tbl-wrap"><table><thead><tr>'+cols.map(c=>'<th>'+escapeHtml(c)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+cols.map(c=>'<td>'+escapeHtml(r[c])+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';}

function sanitizeXml(s){return String(s??'').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'');}
function xml(s){return sanitizeXml(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));}
function rowsFromObjects(rows){if(!rows||!rows.length)return[['No rows']];const cols=Array.from(rows.reduce((set,r)=>{Object.keys(r||{}).forEach(k=>set.add(k));return set;},new Set()));return[cols,...rows.map(r=>cols.map(c=>fmtValue(r?.[c])))];}
function rawRows(text){const lines=(text||'').split(/\r?\n/);return lines.length?lines.map(x=>[x]):[['']];}
function sheetName(name,used){let base=String(name).replace(/[\\/?*:[\]]/g,'_').slice(0,31)||'Sheet';let n=base,i=2;while(used.has(n)){const suffix='_'+i++;n=base.slice(0,31-suffix.length)+suffix;}used.add(n);return n;}
function buildWorkbook(sheets){const used=new Set();const sheetEntries=sheets.map(s=>({name:sheetName(s.name,used),rows:s.rows}));const enc=new TextEncoder();const parts=[];function u8(s){return enc.encode(s);}function sheetXml(rows){let out='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>';rows.forEach((row,r)=>{out+='<row r="'+(r+1)+'">';row.forEach((v,c)=>{const ref=col(c)+(r+1);const num=typeof v==='number'&&Number.isFinite(v);out+='<c r="'+ref+'"'+(num?'':' t="inlineStr"')+'>'+(num?'<v>'+v+'</v>':'<is><t>'+xml(v)+'</t></is>')+'</c>';});out+='</row>';});return out+'</sheetData></worksheet>';}function col(n){let s='';while(n>=0){s=String.fromCharCode(n%26+65)+s;n=Math.floor(n/26)-1;}return s;}const contentTypes='<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+sheetEntries.map((_,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')+'</Types>';const rootRels='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';const wb='<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+sheetEntries.map((s,i)=>'<sheet name="'+xml(s.name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+'</sheets></workbook>';const wbRels='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheetEntries.map((_,i)=>'<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join('')+'</Relationships>';parts.push({name:'[Content_Types].xml',data:u8(contentTypes)},{name:'_rels/.rels',data:u8(rootRels)},{name:'xl/workbook.xml',data:u8(wb)},{name:'xl/_rels/workbook.xml.rels',data:u8(wbRels)});sheetEntries.forEach((s,i)=>parts.push({name:'xl/worksheets/sheet'+(i+1)+'.xml',data:u8(sheetXml(s.rows))}));return zip(parts);}
function zip(entries){const locals=[],centrals=[];let offset=0;const now=new Date();const time=(now.getHours()<<11)|(now.getMinutes()<<5)|Math.floor(now.getSeconds()/2),date=((now.getFullYear()-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate();function u16(n){return Uint8Array.of(n&255,n>>8&255)}function u32(n){return Uint8Array.of(n&255,n>>8&255,n>>16&255,n>>24&255)}function cat(arr){const len=arr.reduce((s,a)=>s+a.length,0),out=new Uint8Array(len);let o=0;arr.forEach(a=>{out.set(a,o);o+=a.length});return out}function crc32(data){let c=~0;for(let i=0;i<data.length;i++){c^=data[i];for(let k=0;k<8;k++)c=(c>>>1)^(0xedb88320&-(c&1));}return(~c)>>>0}entries.forEach(e=>{const name=new TextEncoder().encode(e.name),crc=crc32(e.data);const local=cat([u32(0x04034b50),u16(20),u16(0),u16(0),u16(time),u16(date),u32(crc),u32(e.data.length),u32(e.data.length),u16(name.length),u16(0),name]);locals.push(local,e.data);centrals.push(cat([u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(time),u16(date),u32(crc),u32(e.data.length),u32(e.data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]));offset+=local.length+e.data.length;});const cd=cat(centrals);return cat([...locals,cd,u32(0x06054b50),u16(0),u16(0),u16(entries.length),u16(entries.length),u32(cd.length),u32(offset),u16(0)]);}
function inventorySheets(v){if(!v)return[];return[{name:'Inventory Overview',rows:rowsFromObjects(v.overview)},{name:'Managed Servers',rows:rowsFromObjects(v.servers)},{name:'Inventory Repositories',rows:rowsFromObjects(v.repositories)},{name:'Scale-Out Repos',rows:rowsFromObjects(v.scaleOutRepositories)},{name:'Repo Immutability',rows:rowsFromObjects(v.immutability)},{name:'VMware Proxies',rows:rowsFromObjects(v.viProxies)},{name:'Hyper-V Proxies',rows:rowsFromObjects(v.hvProxies)},{name:'Credentials Meta',rows:rowsFromObjects(v.credentials)},{name:'Inventory Jobs',rows:rowsFromObjects(v.jobs)},{name:'Computer Backup Jobs',rows:rowsFromObjects(v.computerBackupJobs)},{name:'Job Proxy Mapping',rows:rowsFromObjects(v.jobProxyMapping)},{name:'Retention Policies',rows:rowsFromObjects(v.retention)},{name:'GFS Settings',rows:rowsFromObjects(v.gfs)},{name:'Linux Packages',rows:rowsFromObjects(v.linuxPackages)},{name:'Inventory Warnings',rows:rowsFromObjects(v.warnings)},{name:'Veeam Cmdlets',rows:rowsFromObjects(v.cmdlets)}];}
function generateReport(){const p=STATE.parsed;if(!p)return;const meta=STATE.archive?.manifest||{};let sheets=[{name:'Cover',rows:[['VeeamStorageTools Report'],['Generated',new Date().toISOString()],['Archive',STATE.archive?.filename||''],['Customer',meta.customer||val('customerName')],['VBR Label',meta.vbr_label||val('vbrLabel')],['Host',p.metadata.host||p.inventory?.Metadata?.Hostname||''],['Window',p.metadata.window||''],['Jobs',p.metadata.jobs||p.inventoryViews?.jobs?.length||''],['Failed',p.metadata.failed||''],['Warning',p.metadata.warning||''],['Success',p.metadata.success||''],['With Error',p.metadata.with_error||'']]},{name:'Sessions',rows:rowsFromObjects(p.sessions)},{name:'Defined Jobs',rows:rowsFromObjects(p.definedJobs)},{name:'Repositories',rows:rowsFromObjects(p.repositories)},{name:'Capacity Extents',rows:rowsFromObjects(p.capacity?.rows||[])},{name:'Capacity Totals',rows:rowsFromObjects(asArray(p.capacity?.totals_by_sobr))},{name:'SOBR Offloads',rows:rowsFromObjects(p.offloads)},{name:'Manifest',rows:Object.entries(meta)},{name:'Licensing Raw',rows:rawRows(p.sections['VBR Licensing']||'')},{name:'Backup Versions Raw',rows:rawRows(p.sections['Backup Versions']||'')}];sheets=sheets.concat(inventorySheets(p.inventoryViews));sheets=sheets.concat([{name:'Report Raw',rows:rawRows(STATE.reportText)},{name:'Collector JSON Raw',rows:rawRows(STATE.collectorJson?JSON.stringify(STATE.collectorJson,null,2):'')},{name:'Inventory JSON Raw',rows:rawRows(STATE.inventoryJson?JSON.stringify(STATE.inventoryJson,null,2):'')},{name:'Console Log',rows:rawRows(STATE.consoleLog)},{name:'Error Log',rows:rawRows(STATE.errorLog)}]);const bytes=buildWorkbook(sheets);const blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});const fn='VeeamStorageTools_'+safeLabel(meta.vbr_label||val('vbrLabel')||p.inventory?.Metadata?.Hostname,'VBR')+'_'+new Date().toISOString().slice(0,10)+'.xlsx';const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=fn;a.click();URL.revokeObjectURL(url);const el=document.getElementById('reportStatus');el.className='alert alert-success';el.textContent='Generated '+fn;el.style.display='block';showStatus('Downloaded '+fn);}
document.getElementById('dropZone').addEventListener('dragover',e=>{e.preventDefault();e.currentTarget.classList.add('drag-over');});
document.getElementById('dropZone').addEventListener('dragleave',e=>e.currentTarget.classList.remove('drag-over'));
document.getElementById('dropZone').addEventListener('drop',e=>{e.preventDefault();e.currentTarget.classList.remove('drag-over');handleFiles(e.dataTransfer.files);});
loadConfig();refreshUI();
</script>
</body>
</html>
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, html, 'utf8');
console.log(`Wrote ${path.relative(root, outputPath)} with collector SHA256 ${collectorSha256}`);
