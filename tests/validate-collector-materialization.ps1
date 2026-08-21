Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'

$repoRoot=Split-Path -Parent $PSScriptRoot
$indexPath=Join-Path $repoRoot 'index.html'
$html=Get-Content -Path $indexPath -Raw

$collectorMatch=[regex]::Match($html,'<script type="text/plain" id="collectorSource">\r?\n(?<src>.*?)\r?\n</script>','Singleline')
if(-not $collectorMatch.Success){ throw 'collectorSource block not found in index.html' }
$collectorSource=$collectorMatch.Groups['src'].Value

$requiredSnippets=@(
    '$inventory.ComputerBackupJobObjects=$objs.ToArray()',
    '$inventory.TapeInfrastructure=$ti.ToArray()',
    '$inventory.ReferenceIndex.TapeEntities=@($ti.ToArray()|ForEach-Object',
    'Select-RecentRows -Rows $taskRows.ToArray()',
    '$inventory.RestorePointInventory=Get-FlatData (@($rpRows.ToArray() | Select-Object -First 500))',
    '$inventory.DefinedRepositories=@($repoRows.ToArray() | Select-Object -First 500)',
    '$capRowsArr = @($capRows.ToArray() | Select-Object -First 500)',
    '$capTotalsArr = $capTotals.ToArray()',
    '$capacityTierUtilisation[''row_count''] = [int]$capRows.Count',
    '$inventory.SectionDiagnostics=$sectionDiagnostics.ToArray()',
    'echo [FATAL] PowerShell 7 ^(pwsh.exe^) was not found. Install PowerShell 7 and re-run.'
)
foreach($snippet in $requiredSnippets){
    if(-not $collectorSource.Contains($snippet) -and -not $html.Contains($snippet)){ throw "Missing expected source snippet: $snippet" }
}

$regexOptions=[System.Text.RegularExpressions.RegexOptions]::Singleline -bor [System.Text.RegularExpressions.RegexOptions]::Multiline
$toArrayMatch=[regex]::Match($collectorSource,'function To-Array\(\$x\)\{.*?^\}',$regexOptions)
if(-not $toArrayMatch.Success){ throw 'To-Array function not found in collector source' }
Invoke-Expression $toArrayMatch.Value

function Assert-True {
    param([bool]$Condition,[string]$Message)
    if(-not $Condition){ throw $Message }
}

function Assert-IsArrayShape {
    param($Value,[int]$ExpectedCount,[string]$Label)
    Assert-True ($null -ne $Value) "$Label should not be `$null"
    Assert-True ($Value -is [System.Array]) "$Label should deserialize as an array"
    Assert-True ($Value.Count -eq $ExpectedCount) "$Label expected count $ExpectedCount but got $($Value.Count)"
}

function New-ObjectList {
    param([object[]]$Items)
    $list=New-Object 'System.Collections.Generic.List[object]'
    foreach($item in $Items){ [void]$list.Add($item) }
    $list
}

$emptyList=New-ObjectList @()
$singleList=New-ObjectList @([pscustomobject]@{Name='one'})
$multiList=New-ObjectList @([pscustomobject]@{Name='one'},[pscustomobject]@{Name='two'},[pscustomobject]@{Name='three'})

Assert-True (@(To-Array $emptyList).Count -eq 0) 'Empty generic list should materialize to an empty array'
Assert-True (@(To-Array $singleList).Count -eq 1) 'Single-item generic list should materialize to a one-item array'
Assert-True (@(To-Array $multiList).Count -eq 3) 'Multi-item generic list should materialize to a three-item array'
Assert-True (@(To-Array 'pwsh.exe').Count -eq 1 -and @(To-Array 'pwsh.exe')[0] -eq 'pwsh.exe') 'Strings should remain scalar values'
$map=@{Name='repo'}
Assert-True (@(To-Array $map).Count -eq 1 -and @(To-Array $map)[0] -is [System.Collections.IDictionary]) 'Dictionaries should remain scalar values'

function Test-CapacityTierScenario {
    param([int]$Count)
    $capRows=New-Object 'System.Collections.Generic.List[object]'
    $capTotals=New-Object 'System.Collections.Generic.List[object]'
    for($i=1;$i -le $Count;$i++){
        [void]$capRows.Add([pscustomobject][ordered]@{sobr_name="sobr-$i";capacity_extent_name="extent-$i";space=[ordered]@{total='1 GB';used='512 MB';free='512 MB';used_pct='50.00'}})
        [void]$capTotals.Add([pscustomobject][ordered]@{sobr_name="sobr-$i";extent_count=1;space=[ordered]@{total='1 GB';used='512 MB';free='512 MB';used_pct='50.00'}})
    }
    $capRowsArr=@($capRows.ToArray() | Select-Object -First 500)
    $capTotalsArr=$capTotals.ToArray()
    $capacityTierUtilisation=[ordered]@{}
    $capacityTierUtilisation['schema_version']='capacity-tier-utilisation-v1'
    $capacityTierUtilisation['row_count']=[int]$capRows.Count
    $capacityTierUtilisation['rows']=[object[]]$capRowsArr
    $capacityTierUtilisation['totals_by_sobr']=[object[]]$capTotalsArr
    $capacityTierUtilisation['errors']=@()
    [pscustomobject]@{CapacityTierUtilisation=$capacityTierUtilisation} | ConvertTo-Json -Depth 10 | ConvertFrom-Json
}

$emptyResult=Test-CapacityTierScenario -Count 0
Assert-IsArrayShape $emptyResult.CapacityTierUtilisation.rows 0 'rows (empty)'
Assert-IsArrayShape $emptyResult.CapacityTierUtilisation.totals_by_sobr 0 'totals_by_sobr (empty)'

$singleResult=Test-CapacityTierScenario -Count 1
Assert-IsArrayShape $singleResult.CapacityTierUtilisation.rows 1 'rows (single)'
Assert-IsArrayShape $singleResult.CapacityTierUtilisation.totals_by_sobr 1 'totals_by_sobr (single)'

$multiResult=Test-CapacityTierScenario -Count 3
Assert-IsArrayShape $multiResult.CapacityTierUtilisation.rows 3 'rows (multi)'
Assert-IsArrayShape $multiResult.CapacityTierUtilisation.totals_by_sobr 3 'totals_by_sobr (multi)'

Write-Host 'Collector materialization validation passed.'
