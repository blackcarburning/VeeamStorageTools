###############################################################################
# OPENCLAW AUTHORED COLLECTION VERSION
# Veeam StorageTools inventory collector maintained by OpenClaw for blackcarburning.
# Collection-focused inventory: no email delivery, no secrets export.
###############################################################################

<#
.SYNOPSIS
    Collects Veeam Backup & Replication configuration inventory as JSON.

.DESCRIPTION
    Produces a machine-readable inventory shaped for the VeeamStorageTools web
    app and the existing Veeam inventory report processor. Passwords, protected
    strings, and credential secret material are not exported.

.PARAMETER OutputPath
    JSON file path to write. If omitted, JSON is written to stdout.
#>

[CmdletBinding()]
param(
    [string]$OutputPath = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:InventoryWarnings = New-Object 'System.Collections.Generic.List[string]'

function Add-InventoryWarning {
    [CmdletBinding()]
    param([Parameter(Mandatory)] [string]$Message)
    [void]$script:InventoryWarnings.Add($Message)
    Write-Warning $Message
}

function Import-VeeamPowerShell {
    [CmdletBinding()]
    param()

    $loaded = $false
    if (Get-Module -ListAvailable -Name 'Veeam.Backup.PowerShell' -ErrorAction SilentlyContinue) {
        try {
            Import-Module 'Veeam.Backup.PowerShell' -ErrorAction Stop
            $loaded = $true
        } catch {
            Add-InventoryWarning ('Could not import Veeam.Backup.PowerShell: {0}' -f $_.Exception.Message)
        }
    }

    if (-not $loaded) {
        $snapIn = Get-PSSnapin -Registered -Name 'VeeamPSSnapIn' -ErrorAction SilentlyContinue
        if ($snapIn) {
            Add-PSSnapin 'VeeamPSSnapIn' -ErrorAction Stop
            $loaded = $true
        }
    }

    if (-not $loaded) {
        throw 'Unable to load Veeam PowerShell module or snap-in. Run on a VBR server or a host with Veeam console components installed.'
    }
}

function ConvertTo-PlainValue {
    [CmdletBinding()]
    param(
        [AllowNull()] [object]$Value,
        [int]$Depth = 0
    )

    if ($null -eq $Value) { return $null }
    if ($Value -is [string] -or $Value -is [bool] -or $Value -is [char]) { return $Value }
    if ($Value -is [byte] -or $Value -is [int16] -or $Value -is [int] -or $Value -is [long] -or
        $Value -is [single] -or $Value -is [double] -or $Value -is [decimal]) { return $Value }
    if ($Value -is [datetime]) { return $Value.ToString('o') }
    if ($Value -is [guid]) { return $Value.ToString() }
    if ($Depth -ge 3) { return [string]$Value }

    if ($Value -is [System.Collections.IDictionary]) {
        $out = [ordered]@{}
        foreach ($key in $Value.Keys) {
            $name = [string]$key
            if ($name -match '(?i)password|secret|secure|stringprotected|privatekey|accesskey') { continue }
            $out[$name] = ConvertTo-PlainValue -Value $Value[$key] -Depth ($Depth + 1)
        }
        return [pscustomobject]$out
    }

    if ($Value -is [System.Collections.IEnumerable] -and -not ($Value -is [string])) {
        $items = New-Object 'System.Collections.Generic.List[object]'
        foreach ($item in $Value) {
            [void]$items.Add((ConvertTo-PlainValue -Value $item -Depth ($Depth + 1)))
            if ($items.Count -ge 200) { break }
        }
        return @($items)
    }

    $props = @($Value.PSObject.Properties | Where-Object {
        $_.MemberType -match 'Property' -and $_.Name -notmatch '(?i)password|secret|secure|stringprotected|privatekey|accesskey'
    })
    if ($props.Count -eq 0) { return [string]$Value }

    $obj = [ordered]@{}
    foreach ($prop in $props) {
        try {
            $obj[$prop.Name] = ConvertTo-PlainValue -Value $prop.Value -Depth ($Depth + 1)
        } catch {
            $obj[$prop.Name] = [string]$prop.Value
        }
    }
    return [pscustomobject]$obj
}

function Invoke-InventoryList {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [string]$Name,
        [Parameter(Mandatory)] [scriptblock]$ScriptBlock
    )

    try {
        return @(& $ScriptBlock | ForEach-Object { ConvertTo-PlainValue -Value $_ })
    } catch {
        Add-InventoryWarning ('{0} failed: {1}' -f $Name, $_.Exception.Message)
        return @()
    }
}

function Invoke-InventoryObject {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [string]$Name,
        [Parameter(Mandatory)] [scriptblock]$ScriptBlock
    )

    try {
        $value = & $ScriptBlock
        if ($null -eq $value) { return $null }
        return ConvertTo-PlainValue -Value $value
    } catch {
        Add-InventoryWarning ('{0} failed: {1}' -f $Name, $_.Exception.Message)
        return $null
    }
}

function Get-InventoryListByCmdlet {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [string]$CmdletName,
        [scriptblock]$ScriptBlock
    )

    if (-not (Get-Command -Name $CmdletName -ErrorAction SilentlyContinue)) {
        Add-InventoryWarning ('{0} cmdlet not available' -f $CmdletName)
        return @()
    }

    return Invoke-InventoryList -Name $CmdletName -ScriptBlock $ScriptBlock
}

function Get-InventoryObjectByCmdlet {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [string]$CmdletName,
        [scriptblock]$ScriptBlock
    )

    if (-not (Get-Command -Name $CmdletName -ErrorAction SilentlyContinue)) {
        Add-InventoryWarning ('{0} cmdlet not available' -f $CmdletName)
        return $null
    }

    return Invoke-InventoryObject -Name $CmdletName -ScriptBlock $ScriptBlock
}

function Get-CredentialsMetadataOnly {
    [CmdletBinding()]
    param()

    if (-not (Get-Command -Name 'Get-VBRCredentials' -ErrorAction SilentlyContinue)) { return @() }
    return Invoke-InventoryList -Name 'Get-VBRCredentials' -ScriptBlock {
        Get-VBRCredentials -ErrorAction SilentlyContinue | ForEach-Object {
            [pscustomobject][ordered]@{
                Name = if ($_.PSObject.Properties['Name']) { $_.Name } else { '' }
                Type = if ($_.PSObject.Properties['Type']) { $_.Type } else { $null }
                UserName = if ($_.PSObject.Properties['UserName']) { $_.UserName } else { '' }
                Domain = if ($_.PSObject.Properties['Domain']) { $_.Domain } else { $null }
                IsReadOnly = if ($_.PSObject.Properties['IsReadOnly']) { $_.IsReadOnly } else { $null }
                CreationTime = if ($_.PSObject.Properties['CreationTime']) { $_.CreationTime } else { $null }
                LastModifiedTime = if ($_.PSObject.Properties['LastModifiedTime']) { $_.LastModifiedTime } else { $null }
            }
        }
    }
}

function Get-AvailableVeeamCmdlets {
    [CmdletBinding()]
    param()

    return @(Get-Command -Name 'Get-VBR*','Set-VBR*','Add-VBR*','New-VBR*','Remove-VBR*' -ErrorAction SilentlyContinue |
        Sort-Object -Property Name |
        ForEach-Object {
            [pscustomobject][ordered]@{
                Name = $_.Name
                CommandType = [string]$_.CommandType
                Version = if ($_.Version) { [string]$_.Version } else { '' }
                Source = if ($_.Source) { [string]$_.Source } else { '' }
            }
        })
}

function Get-RepositoryImmutability {
    [CmdletBinding()]
    param([object[]]$Repositories)

    return @($Repositories | ForEach-Object {
        [pscustomobject][ordered]@{
            RepositoryName = $_.Name
            RepositoryType = $_.Type
            Settings = if ($_.PSObject.Properties['MakeRecentBackupsImmutable']) { $_.MakeRecentBackupsImmutable } elseif ($_.PSObject.Properties['IsLinuxHardened']) { $_.IsLinuxHardened } else { '' }
        }
    })
}

function Get-JobRetentionPolicies {
    [CmdletBinding()]
    param([object[]]$Jobs, [object[]]$ComputerBackupJobs)

    $rows = New-Object 'System.Collections.Generic.List[object]'
    foreach ($job in @($Jobs)) {
        [void]$rows.Add([pscustomobject][ordered]@{
            JobName = $job.Name
            JobType = $job.JobType
            Source = 'GenericJobProperties'
            Settings = if ($job.PSObject.Properties['Options']) { [string]$job.Options } else { '' }
        })
    }
    foreach ($job in @($ComputerBackupJobs)) {
        [void]$rows.Add([pscustomobject][ordered]@{
            JobName = $job.Name
            JobType = $job.Type
            Source = 'ComputerBackupJob'
            Settings = if ($job.PSObject.Properties['RetentionPolicy']) { [string]$job.RetentionPolicy } else { '' }
        })
    }
    return @($rows)
}

function Get-JobGFSSettings {
    [CmdletBinding()]
    param([object[]]$Jobs)

    return @($Jobs | ForEach-Object {
        [pscustomobject][ordered]@{
            JobName = $_.Name
            JobType = $_.JobType
            Settings = if ($_.PSObject.Properties['GFSOptions']) { [string]$_.GFSOptions } else { '' }
        }
    })
}

Import-VeeamPowerShell

$servers = Get-InventoryListByCmdlet -CmdletName 'Get-VBRServer' -ScriptBlock { Get-VBRServer -ErrorAction SilentlyContinue }
$repositories = Get-InventoryListByCmdlet -CmdletName 'Get-VBRBackupRepository' -ScriptBlock { Get-VBRBackupRepository -ErrorAction SilentlyContinue -WarningAction SilentlyContinue }
$scaleOutRepositories = Get-InventoryListByCmdlet -CmdletName 'Get-VBRBackupRepository' -ScriptBlock { Get-VBRBackupRepository -ScaleOut -ErrorAction SilentlyContinue -WarningAction SilentlyContinue }
$viProxies = Get-InventoryListByCmdlet -CmdletName 'Get-VBRViProxy' -ScriptBlock { Get-VBRViProxy -ErrorAction SilentlyContinue }
$hvProxies = Get-InventoryListByCmdlet -CmdletName 'Get-VBRHvProxy' -ScriptBlock { Get-VBRHvProxy -ErrorAction SilentlyContinue }
$jobs = Get-InventoryListByCmdlet -CmdletName 'Get-VBRJob' -ScriptBlock { Get-VBRJob -ErrorAction SilentlyContinue -WarningAction SilentlyContinue }
$computerBackupJobs = Get-InventoryListByCmdlet -CmdletName 'Get-VBRComputerBackupJob' -ScriptBlock { Get-VBRComputerBackupJob -ErrorAction SilentlyContinue -WarningAction SilentlyContinue }
$backupCopyJobs = Get-InventoryListByCmdlet -CmdletName 'Get-VBRBackupCopyJob' -ScriptBlock { Get-VBRBackupCopyJob -ErrorAction SilentlyContinue -WarningAction SilentlyContinue }
$sureBackupJobs = Get-InventoryListByCmdlet -CmdletName 'Get-VBRSureBackupJob' -ScriptBlock { Get-VBRSureBackupJob -ErrorAction SilentlyContinue -WarningAction SilentlyContinue }
$tapeJobs = Get-InventoryListByCmdlet -CmdletName 'Get-VBRTapeJob' -ScriptBlock { Get-VBRTapeJob -ErrorAction SilentlyContinue -WarningAction SilentlyContinue }
$linuxPackages = Get-InventoryListByCmdlet -CmdletName 'Get-VBRLinuxPackage' -ScriptBlock { Get-VBRLinuxPackage -ErrorAction SilentlyContinue }

$backupServerInfo = Get-InventoryObjectByCmdlet -CmdletName 'Get-VBRBackupServerInfo' -ScriptBlock { Get-VBRBackupServerInfo -ErrorAction SilentlyContinue }
if ($null -eq $backupServerInfo) {
    $backupServerInfo = [pscustomobject][ordered]@{
        Name = 'localhost'
        Build = ''
        PatchLevel = ''
    }
}

$inventory = [pscustomobject][ordered]@{
    Metadata = [pscustomobject][ordered]@{
        GeneratedAt = (Get-Date).ToString('o')
        TargetServer = 'localhost'
        Hostname = if ($env:COMPUTERNAME) { $env:COMPUTERNAME } else { [System.Environment]::MachineName }
        User = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
        PSVersion = [string]$PSVersionTable.PSVersion
    }
    BackupServerInfo = $backupServerInfo
    Servers = $servers
    Repositories = $repositories
    ScaleOutRepositories = $scaleOutRepositories
    ViProxies = $viProxies
    HvProxies = $hvProxies
    CredentialsMetadataOnly = Get-CredentialsMetadataOnly
    Jobs = $jobs
    ComputerBackupJobs = $computerBackupJobs
    JobProxyMapping = @()
    BackupCopyJobs = $backupCopyJobs
    SureBackupJobs = $sureBackupJobs
    TapeJobs = $tapeJobs
    LinuxPackages = $linuxPackages
    JobRetentionPolicies = Get-JobRetentionPolicies -Jobs $jobs -ComputerBackupJobs $computerBackupJobs
    JobGFSSettings = Get-JobGFSSettings -Jobs $jobs
    RepositoryImmutability = Get-RepositoryImmutability -Repositories $repositories
    AvailableVeeamCmdlets = Get-AvailableVeeamCmdlets
    Audit = $null
    Warnings = @($script:InventoryWarnings)
}

$json = ConvertTo-Json -InputObject $inventory -Depth 12
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    Write-Output $json
} else {
    $fullPath = [IO.Path]::GetFullPath($OutputPath)
    $parent = [IO.Path]::GetDirectoryName($fullPath)
    if ($parent -and -not (Test-Path -LiteralPath $parent)) {
        $null = New-Item -ItemType Directory -Path $parent -Force
    }
    [System.IO.File]::WriteAllText($fullPath, $json, [System.Text.Encoding]::UTF8)
    Write-Host ('Veeam inventory JSON written to: {0}' -f $fullPath)
}
