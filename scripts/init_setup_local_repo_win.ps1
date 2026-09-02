param (
    [ValidateSet("Check", "Sync", "Uninstall")]
    [string]$Action = "Sync",
    [ValidateSet("Copy", "Link")]
    [string]$Mode = "",
    [ValidateSet("All", "Stable")]
    [string]$Channel = "All"
)

$ErrorActionPreference = "Stop"
$SkillsRepo = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$ProjectRoot = (Get-Location).Path
$AgentsDir = Join-Path $ProjectRoot ".agents"
$InstallState = Join-Path $AgentsDir ".install-state"
$script:Drift = $false
$script:ReplaceLinks = @()
$script:StaleEntries = @()

function Get-NormalizedPath {
    param ([string]$Path)
    return [System.IO.Path]::GetFullPath($Path).TrimEnd('\', '/')
}

function Test-PathExists {
    param ([string]$Path)
    return Test-Path -LiteralPath $Path
}

function Get-PathEntry {
    param ([string]$Path)
    $parent = Split-Path -Parent $Path
    if (-not (Test-Path -LiteralPath $parent -PathType Container)) { return $null }
    $leaf = Split-Path -Leaf $Path
    return (Get-ChildItem -LiteralPath $parent -Force | Where-Object Name -CEQ $leaf | Select-Object -First 1)
}

function Get-LinkTargetPath {
    param ($Item)
    $target = [string]$Item.Target
    if (-not [System.IO.Path]::IsPathRooted($target)) {
        $target = Join-Path $Item.Parent.FullName $target
    }
    return (Get-NormalizedPath $target)
}

function Test-ManagedSkillLink {
    param ($Item)
    if ($null -eq $Item -or $null -eq $Item.LinkType) { return $false }
    $prefix = (Get-NormalizedPath $skillsSource) + [System.IO.Path]::DirectorySeparatorChar
    return (Get-LinkTargetPath $Item).StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)
}

function Assert-DirectorySlot {
    param ([string]$Path)
    if (-not (Test-PathExists $Path)) { return }

    $item = Get-Item -LiteralPath $Path -Force
    if ($null -ne $item.LinkType) {
        throw "Expected a project-local directory but found a link: $Path"
    }
    if (-not $item.PSIsContainer) {
        throw "Expected a directory but found another file type: $Path"
    }
}

function Assert-FileSlot {
    param ([string]$Path)
    if (-not (Test-PathExists $Path)) { return }

    $item = Get-Item -LiteralPath $Path -Force
    if ($null -ne $item.LinkType) {
        throw "Expected a project-local file but found a link: $Path"
    }
    if ($item.PSIsContainer) {
        throw "Expected a regular file but found a directory: $Path"
    }
}

function Assert-LinkSlot {
    param (
        [string]$Source,
        [string]$Destination
    )

    $item = Get-PathEntry $Destination
    if ($null -eq $item) {
        Write-Host "Missing: $Destination"
        $script:Drift = $true
        return
    }
    if ($item.LinkType -notin @("Junction", "SymbolicLink")) {
        throw "Refusing to replace an existing file or directory: $Destination"
    }

    $target = Get-LinkTargetPath $item
    if ($target -ne (Get-NormalizedPath $Source)) {
        if (Test-ManagedSkillLink $item) {
            Write-Host "Outdated: $Destination -> $target"
            $script:ReplaceLinks += $Destination
            $script:Drift = $true
            return
        }
        throw "Existing link points to '$target'; expected '$Source': $Destination"
    }
}

function Ensure-Line {
    param ([string]$Path, [string]$Line)
    if (-not (Select-String -LiteralPath $Path -SimpleMatch -Pattern $Line -Quiet)) {
        Add-Content -LiteralPath $Path -Value $Line -Encoding utf8
    }
}

function Write-FileIfMissing {
    param (
        [string]$Path,
        [string]$Content
    )

    if (Test-PathExists $Path) {
        Write-Host "Unchanged: $Path"
        return
    }

    [System.IO.File]::WriteAllText(
        $Path,
        $Content + [Environment]::NewLine,
        [System.Text.UTF8Encoding]::new($false)
    )
    Write-Host "Created: $Path"
}

function Install-SharedDirectory {
    param (
        [string]$Source,
        [string]$Destination,
        [string]$InstallMode
    )

    if ($InstallMode -eq "Link") {
        if (Test-PathExists $Destination) {
            Write-Host "Unchanged: $Destination"
            return
        }

        New-Item -ItemType Junction -Path $Destination -Target $Source | Out-Null
        Write-Host "Linked: $Destination -> $Source"
        return
    }

    if (-not (Test-PathExists $Destination)) {
        Copy-Item -LiteralPath $Source -Destination $Destination -Recurse
        Write-Host "Copied: $Destination"
        return
    }

    $item = Get-Item -LiteralPath $Destination -Force
    if ($null -ne $item.LinkType -or -not $item.PSIsContainer) {
        throw "Copy Mode requires a regular directory: $Destination"
    }

    Copy-Item -Path (Join-Path $Source "*") -Destination $Destination -Recurse -Force
    Write-Host "Refreshed without deleting local files: $Destination"
}

if (-not (Test-Path -LiteralPath (Join-Path $SkillsRepo "skills") -PathType Container)) {
    throw "Skills directory not found: $SkillsRepo\skills"
}
if (-not (Test-Path -LiteralPath (Join-Path $SkillsRepo "rules\skills.md") -PathType Leaf)) {
    throw "Rules file not found: $SkillsRepo\rules\skills.md"
}
if ((Get-NormalizedPath $ProjectRoot) -eq (Get-NormalizedPath $SkillsRepo)) {
    throw "Run this script from a development project, not from the Agent home."
}

if ([string]::IsNullOrWhiteSpace($Mode) -and $Action -ne "Sync") {
    $savedMode = if (Test-Path -LiteralPath $InstallState -PathType Leaf) {
        (Get-Content -LiteralPath $InstallState | Where-Object { $_ -like "mode=*" } | Select-Object -First 1) -replace "^mode=", ""
    } else { "" }
    $Mode = if ($savedMode -in @("copy", "link")) {
        (Get-Culture).TextInfo.ToTitleCase($savedMode)
    } else { "Link" }
}

if ([string]::IsNullOrWhiteSpace($Mode)) {
    Write-Host "Select installation mode:"
    Write-Host "  [1] Link Mode (recommended; updates with the Agent home)"
    Write-Host "  [2] Copy Mode (for IDE compatibility; rerun to refresh)"
    $choice = Read-Host "Enter option [1 or 2, default is 1]"
    $Mode = if ($choice -eq "2") { "Copy" } else { "Link" }
}

if ($Mode -notin @("Copy", "Link")) {
    throw "Invalid mode. Use 'Copy' or 'Link'."
}

$skillsSource = Join-Path $SkillsRepo "skills"
$rulesSource = Join-Path $SkillsRepo "rules"
$skillsDestination = Join-Path $AgentsDir "skills"
$rulesDestination = Join-Path $AgentsDir "rules"
$skillSources = @(
    Get-ChildItem -LiteralPath $skillsSource -Filter "SKILL.md" -File -Recurse |
        Where-Object { $Channel -eq "All" -or $_.Directory.FullName -notlike (Join-Path $skillsSource "in-progress\*") } |
        Sort-Object FullName |
        ForEach-Object {
            [PSCustomObject]@{
                Name = $_.Directory.Name
                Source = $_.Directory.FullName
            }
        }
)
if ($skillSources.Count -eq 0) {
    throw "No skills found under: $skillsSource"
}
$duplicateSkills = @($skillSources | Group-Object Name | Where-Object Count -gt 1)
if ($duplicateSkills.Count -gt 0) {
    throw "Duplicate skill name: $($duplicateSkills[0].Name)"
}

function Get-InstallStateContent {
    $lines = @(
        "version=1"
        "mode=$($Mode.ToLowerInvariant())"
        "channel=$($Channel.ToLowerInvariant())"
        "source=$SkillsRepo"
    )
    $lines += @($skillSources.Name | Sort-Object | ForEach-Object { "skill=$_" })
    return ($lines -join "`n") + "`n"
}

function Write-InstallState {
    [System.IO.File]::WriteAllText(
        $InstallState,
        (Get-InstallStateContent),
        [System.Text.UTF8Encoding]::new($false)
    )
}

$previousManaged = if (Test-Path -LiteralPath $InstallState -PathType Leaf) {
    @(Get-Content -LiteralPath $InstallState | Where-Object { $_ -like "skill=*" } | ForEach-Object { $_.Substring(6) })
} else { @() }
$previousMode = if (Test-Path -LiteralPath $InstallState -PathType Leaf) {
    (Get-Content -LiteralPath $InstallState | Where-Object { $_ -like "mode=*" } | Select-Object -First 1) -replace "^mode=", ""
} else { "" }

if ($Action -eq "Uninstall") {
    if (Test-Path -LiteralPath $skillsDestination -PathType Container) {
        foreach ($item in Get-ChildItem -LiteralPath $skillsDestination -Force) {
            $managedCopy = $previousMode -eq "copy" -and $item.Name -in $previousManaged
            if ((Test-ManagedSkillLink $item) -or $managedCopy) {
                Remove-Item -LiteralPath $item.FullName -Recurse -Force
                Write-Host "Removed: $($item.FullName)"
            }
        }
    }
    $rulesItem = Get-PathEntry $rulesDestination
    if ($null -ne $rulesItem) {
        $linkedRules = $null -ne $rulesItem.LinkType -and (Get-LinkTargetPath $rulesItem) -eq (Get-NormalizedPath $rulesSource)
        if ($linkedRules -or $previousMode -eq "copy") {
            Remove-Item -LiteralPath $rulesDestination -Recurse -Force
            Write-Host "Removed: $rulesDestination"
        }
    }
    Remove-Item -LiteralPath $InstallState -Force -ErrorAction SilentlyContinue
    Write-Host "Agent project uninstall complete. Project-local knowledge was preserved."
    exit 0
}

# Preflight every destination before creating or changing anything.
Assert-DirectorySlot $AgentsDir
Assert-DirectorySlot (Join-Path $AgentsDir "docs")
Assert-DirectorySlot (Join-Path $AgentsDir "docs\adr")
Assert-FileSlot (Join-Path $AgentsDir "CONTEXT.md")
Assert-FileSlot (Join-Path $AgentsDir ".gitignore")
$legacySkillsLink = $false
if (Test-PathExists $skillsDestination) {
    $skillsItem = Get-Item -LiteralPath $skillsDestination -Force
    if ($null -ne $skillsItem.LinkType) {
        $target = [string]$skillsItem.Target
        if (-not [System.IO.Path]::IsPathRooted($target)) {
            $target = Join-Path $skillsItem.Parent.FullName $target
        }
        if ((Get-NormalizedPath $target) -ne (Get-NormalizedPath $skillsSource)) {
            throw "Existing link points to '$target'; expected '$skillsSource': $skillsDestination"
        }
        $legacySkillsLink = $true
    } elseif (-not $skillsItem.PSIsContainer) {
        throw "Expected a directory but found another file type: $skillsDestination"
    }
}

if (-not $legacySkillsLink) {
    foreach ($skill in $skillSources) {
        $destination = Join-Path $skillsDestination $skill.Name
        if ($Mode -eq "Link") {
            Assert-LinkSlot $skill.Source $destination
        } else {
            if (-not (Test-PathExists $destination)) {
                Write-Host "Missing: $destination"
                $script:Drift = $true
            } else {
                Assert-DirectorySlot $destination
            }
        }
    }
}
if ($Mode -eq "Link") {
    Assert-LinkSlot $rulesSource $rulesDestination
} else {
    if (-not (Test-PathExists $rulesDestination)) {
        Write-Host "Missing: $rulesDestination"
        $script:Drift = $true
    } else {
        Assert-DirectorySlot $rulesDestination
    }
}

$desiredNames = @{}; foreach ($skill in $skillSources) { $desiredNames[$skill.Name] = $true }
if (Test-Path -LiteralPath $skillsDestination -PathType Container) {
    foreach ($item in Get-ChildItem -LiteralPath $skillsDestination -Force) {
        if ($desiredNames.ContainsKey($item.Name)) { continue }
        $isManaged = if ($Mode -eq "Link") { Test-ManagedSkillLink $item } else { $item.Name -in $previousManaged }
        if ($isManaged) {
            Write-Host "Stale: $($item.FullName)"
            $script:StaleEntries += $item.FullName
            $script:Drift = $true
        }
    }
}

foreach ($requiredIgnore in @("/skills", "/rules", "/.install-state")) {
    $gitignore = Join-Path $AgentsDir ".gitignore"
    if (-not (Test-Path -LiteralPath $gitignore -PathType Leaf) -or
        -not (Select-String -LiteralPath $gitignore -SimpleMatch -Pattern $requiredIgnore -Quiet)) {
        Write-Host "Missing: $gitignore entry $requiredIgnore"
        $script:Drift = $true
    }
}

$actualState = if (Test-Path -LiteralPath $InstallState -PathType Leaf) {
    (Get-Content -LiteralPath $InstallState -Raw).Replace("`r`n", "`n")
} else { "" }
if ($actualState -ne (Get-InstallStateContent)) {
    Write-Host "Outdated: $InstallState"
    $script:Drift = $true
}

if ($Action -eq "Check") {
    if ($script:Drift) {
        Write-Host "Agent project installation has drift."
        exit 2
    }
    Write-Host "Agent project installation is current."
    exit 0
}

if ($Mode -eq "Copy" -and $script:StaleEntries.Count -gt 0) {
    throw "Stale managed Copy Mode entries require manual review before synchronization: $($script:StaleEntries -join ', ')"
}
foreach ($destination in @($script:ReplaceLinks + $script:StaleEntries)) {
    Remove-Item -LiteralPath $destination -Recurse -Force
    Write-Host "Removed: $destination"
}

New-Item -ItemType Directory -Force -Path (Join-Path $AgentsDir "docs\adr") | Out-Null

Write-FileIfMissing (Join-Path $AgentsDir "CONTEXT.md") @'
# Project Context

Project-specific domain language and relationships belong here.
'@

Write-FileIfMissing (Join-Path $AgentsDir ".gitignore") @'
# Machine-local shared Agent home links
/skills
/rules
/.install-state
'@

Ensure-Line (Join-Path $AgentsDir ".gitignore") "/skills"
Ensure-Line (Join-Path $AgentsDir ".gitignore") "/rules"
Ensure-Line (Join-Path $AgentsDir ".gitignore") "/.install-state"

if ($legacySkillsLink) {
    Remove-Item -LiteralPath $skillsDestination -Force
    New-Item -ItemType Directory -Path $skillsDestination | Out-Null
    Write-Host "Migrated: $skillsDestination from whole-directory link to flat skill entries"
} elseif (-not (Test-PathExists $skillsDestination)) {
    New-Item -ItemType Directory -Path $skillsDestination | Out-Null
}

foreach ($skill in $skillSources) {
    Install-SharedDirectory $skill.Source (Join-Path $skillsDestination $skill.Name) $Mode
}

Install-SharedDirectory $rulesSource $rulesDestination $Mode
Write-InstallState

Write-Host "Agent project initialization complete."
exit 0
