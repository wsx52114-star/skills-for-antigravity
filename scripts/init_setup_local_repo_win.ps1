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
    return (Test-Path -LiteralPath $Path) -or ($null -ne (Get-PathEntry $Path))
}

function Get-PathEntry {
    param ([string]$Path)
    try { return Get-Item -LiteralPath $Path -Force -ErrorAction Stop }
    catch {
        $parent = Split-Path -Parent $Path
        $leaf = Split-Path -Leaf $Path
        if (-not [string]::IsNullOrEmpty($parent) -and (Test-Path -LiteralPath $parent -PathType Container)) {
            $child = Get-ChildItem -LiteralPath $parent -Force | Where-Object { $_.Name -ieq $leaf } | Select-Object -First 1
            if ($null -ne $child) { return $child }
        }
        return $null
    }
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
    $item = Get-PathEntry $Path
    if ($null -eq $item) { return }
    if ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
        throw "Expected a project-local directory but found a link: $Path"
    }
    if (-not $item.PSIsContainer) {
        throw "Expected a directory but found another file type: $Path"
    }
}

function Assert-FileSlot {
    param ([string]$Path)
    $item = Get-PathEntry $Path
    if ($null -eq $item) { return }
    if ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
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

function Test-IgnoreLine {
    param ([string]$Path, [string]$Line)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $false }
    $lastRule = -1; $lastNegation = -1; $index = 0
    foreach ($entry in Get-Content -LiteralPath $Path) {
        if ($entry -ceq $Line) { $lastRule = $index }
        if ($entry.TrimStart().StartsWith('!')) { $lastNegation = $index }
        $index++
    }
    return $lastRule -gt $lastNegation
}

function Remove-DirectoryLink {
    param ([string]$Path)
    $item = Get-PathEntry $Path
    if ($null -eq $item -or $item.LinkType -notin @("Junction", "SymbolicLink") -or -not $item.PSIsContainer) {
        throw "Expected a directory link: $Path"
    }
    # Non-recursive deletion unlinks the directory on both Windows PowerShell 5.1 and PowerShell 7.
    [System.IO.Directory]::Delete($item.FullName)
}

function Ensure-Line {
    param ([string]$Path, [string]$Line)
    if (-not (Test-IgnoreLine $Path $Line)) {
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
        [string]$Destination
    )

    if (Test-PathExists $Destination) {
        Write-Host "Unchanged: $Destination"
        return
    }
    New-Item -ItemType Junction -Path $Destination -Target $Source | Out-Null
    Write-Host "Linked: $Destination -> $Source"
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

# Validate ancestors before reading state or performing any action, including uninstall.
$ancestor = $ProjectRoot
while (Split-Path -Parent $ancestor) {
    Assert-DirectorySlot $ancestor
    $ancestor = Split-Path -Parent $ancestor
}
Assert-DirectorySlot $AgentsDir
Assert-FileSlot $InstallState

if ([string]::IsNullOrWhiteSpace($Mode) -and $Action -ne "Sync") {
    $savedMode = if (Test-Path -LiteralPath $InstallState -PathType Leaf) {
        (Get-Content -LiteralPath $InstallState -Encoding utf8 | Where-Object { $_ -like "mode=*" } | Select-Object -First 1) -replace "^mode=", ""
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
        $(if ($Mode -eq "Copy") { "version=2" } else { "version=1" })
        "mode=$($Mode.ToLowerInvariant())"
        "channel=$($Channel.ToLowerInvariant())"
        "source=$SkillsRepo"
    )
    $lines += @($skillSources.Name | Sort-Object | ForEach-Object { "skill=$_" })
    if ($Mode -eq "Copy") {
        $lines += @($script:DesiredCopyHashes.Keys | Sort-Object | ForEach-Object {
            "file=$($script:DesiredCopyHashes[$_])`t$_"
        })
    }
    return ($lines -join "`n") + "`n"
}

function Write-InstallState {
    [System.IO.File]::WriteAllText(
        "$InstallState.tmp",
        (Get-InstallStateContent),
        [System.Text.UTF8Encoding]::new($false)
    )
    Move-Item -LiteralPath "$InstallState.tmp" -Destination $InstallState -Force
}

$previousManaged = if (Test-Path -LiteralPath $InstallState -PathType Leaf) {
    @(Get-Content -LiteralPath $InstallState -Encoding utf8 | Where-Object { $_ -like "skill=*" } | ForEach-Object { $_.Substring(6) })
} else { @() }
$previousMode = if (Test-Path -LiteralPath $InstallState -PathType Leaf) {
    (Get-Content -LiteralPath $InstallState -Encoding utf8 | Where-Object { $_ -like "mode=*" } | Select-Object -First 1) -replace "^mode=", ""
} else { "" }

$script:DesiredCopyHashes = @{}
$copySources = @{}
$previousCopyHashes = @{}
$copyConflicts = @()
$copyRoots = @{}

function Get-CopyPath {
    param ([string]$Relative)
    if ($Relative -notmatch '^(skills/[a-z0-9]+(?:-[a-z0-9]+)*/|rules/).+' -or
        $Relative -match '(^|/)\.{1,2}(/|$)|[\\:\t\r\n*?<>|"]|[. ](/|$)|//' -or $Relative.EndsWith('/')) {
        throw "Invalid managed copy path: $Relative"
    }
    $resolved = Get-NormalizedPath (Join-Path $AgentsDir $Relative)
    $prefix = (Get-NormalizedPath $AgentsDir) + [System.IO.Path]::DirectorySeparatorChar
    if (-not $resolved.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Managed copy path escapes the project: $Relative"
    }
    $parent = Split-Path -Parent $resolved
    while ($parent.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        Assert-DirectorySlot $parent
        $parent = Split-Path -Parent $parent
    }
    return $resolved
}

function Get-RegularFiles {
    param ([string]$Directory)
    Assert-DirectorySlot $Directory
    if (-not (Test-PathExists $Directory)) { return }
    foreach ($entry in Get-ChildItem -LiteralPath $Directory -Force) {
        if ($entry.PSIsContainer) { Get-RegularFiles $entry.FullName }
        else {
            Assert-FileSlot $entry.FullName
            $entry
        }
    }
}

if ($Mode -eq "Copy" -or $previousMode -eq "copy") {
    Assert-DirectorySlot $skillsDestination
    $stateLines = if (Test-PathExists $InstallState) { @(Get-Content -LiteralPath $InstallState -Encoding utf8) } else { @() }
    $previousSource = ($stateLines | Where-Object { $_ -like "source=*" } | Select-Object -First 1) -replace "^source=", ""
    if ($previousMode -eq "copy" -and $previousSource -ne $SkillsRepo) {
        throw "Copy installation belongs to another Agent home: $previousSource"
    }
    foreach ($line in $stateLines | Where-Object { $_ -like "file=*" }) {
        if ($line -notmatch '^file=([0-9a-f]{64})\t(.+)$') { throw "Invalid copy content baseline" }
        $hash = $Matches[1]; $relative = $Matches[2]
        $null = Get-CopyPath $relative
        if ($previousCopyHashes.ContainsKey($relative)) { throw "Duplicate managed copy path: $relative" }
        $previousCopyHashes[$relative] = $hash
    }
    foreach ($name in $previousManaged) {
        if ($name -notmatch '^[a-z0-9]+(?:-[a-z0-9]+)*$') { throw "Invalid managed skill name: $name" }
        $copyRoots["skills/$name"] = $true
    }
    if ($previousMode -eq "copy") { $copyRoots["rules"] = $true }
    foreach ($relative in $previousCopyHashes.Keys) {
        $parts = $relative.Split('/')
        $root = if ($parts[0] -eq "rules") { "rules" } else { "skills/$($parts[1])" }
        if (-not $copyRoots.ContainsKey($root)) { throw "Copy baseline contains an unmanaged root: $relative" }
    }
    if ($Mode -eq "Copy" -and $Action -ne "Uninstall") {
        $sources = @(@{ Relative = "rules"; Source = $rulesSource })
        $sources += @($skillSources | ForEach-Object { @{ Relative = "skills/$($_.Name)"; Source = $_.Source } })
        foreach ($root in $sources) {
            $copyRoots[$root.Relative] = $true
            foreach ($file in Get-RegularFiles $root.Source) {
                $relative = $root.Relative + "/" + $file.FullName.Substring($root.Source.Length + 1).Replace('\', '/')
                $null = Get-CopyPath $relative
                $copySources[$relative] = $file.FullName
                $script:DesiredCopyHashes[$relative] = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
            }
        }
    }
    foreach ($root in $copyRoots.Keys) {
        $directory = Join-Path $AgentsDir $root
        $null = @(Get-RegularFiles $directory)
        if ((Test-PathExists $directory) -and
            ($previousMode -ne "copy" -or $previousCopyHashes.Count -eq 0 -or
             ($root -ne "rules" -and $root.Substring(7) -notin $previousManaged))) {
            $copyConflicts += "Unmanaged directory or missing copy content baseline: $directory. Preserve it outside .agents/skills or .agents/rules before reinstalling."
        }
    }
    foreach ($relative in @(@($previousCopyHashes.Keys) + @($copySources.Keys) | Sort-Object -Unique)) {
        $destination = Get-CopyPath $relative
        $entry = Get-PathEntry $destination
        if ($null -eq $entry) { $script:Drift = $true; continue }
        Assert-FileSlot $destination
        $hash = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant()
        if (-not $previousCopyHashes.ContainsKey($relative) -or $hash -ne $previousCopyHashes[$relative]) {
            $copyConflicts += "Local or unmanaged file: $destination"
        }
        if (-not $script:DesiredCopyHashes.ContainsKey($relative) -or $hash -ne $script:DesiredCopyHashes[$relative]) {
            Write-Host "Outdated: $destination"
            $script:Drift = $true
        }
    }
    if ($copyConflicts.Count -gt 0) {
        $script:Drift = $true
        if ($Action -eq "Check") { $copyConflicts | ForEach-Object { Write-Host "Conflict: $_" } }
        else { throw ($copyConflicts -join [Environment]::NewLine) }
    }
}

function Update-CopiedFiles {
    foreach ($relative in $previousCopyHashes.Keys) {
        if (-not $copySources.ContainsKey($relative)) {
            $destination = Get-CopyPath $relative
            if (Test-PathExists $destination) { Remove-Item -LiteralPath $destination -Force }
        }
    }
    foreach ($relative in $copySources.Keys) {
        $destination = Get-CopyPath $relative
        New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
        Copy-Item -LiteralPath $copySources[$relative] -Destination $destination -Force
    }
    foreach ($root in $copyRoots.Keys) {
        $directory = Join-Path $AgentsDir $root
        if (-not (Test-PathExists $directory)) { continue }
        $directories = @((Get-Item -LiteralPath $directory)) + @(Get-ChildItem -LiteralPath $directory -Directory -Recurse -Force)
        foreach ($item in $directories | Sort-Object { $_.FullName.Length } -Descending) {
            if (@(Get-ChildItem -LiteralPath $item.FullName -Force).Count -eq 0) {
                Remove-Item -LiteralPath $item.FullName -Force
            }
        }
    }
}

if ($Action -eq "Uninstall") {
    Assert-DirectorySlot $skillsDestination
    if ($previousMode -eq "copy") {
        Update-CopiedFiles
    }
    if (Test-Path -LiteralPath $skillsDestination -PathType Container) {
        foreach ($item in Get-ChildItem -LiteralPath $skillsDestination -Force) {
            if (Test-ManagedSkillLink $item) {
                Remove-DirectoryLink $item.FullName
                Write-Host "Removed: $($item.FullName)"
            }
        }
    }
    $rulesItem = Get-PathEntry $rulesDestination
    if ($null -ne $rulesItem) {
        $linkedRules = $null -ne $rulesItem.LinkType -and (Get-LinkTargetPath $rulesItem) -eq (Get-NormalizedPath $rulesSource)
        if ($linkedRules) {
            Remove-DirectoryLink $rulesDestination
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
Assert-FileSlot "$InstallState.tmp"
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
        $script:Drift = $true
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
    if (-not (Test-IgnoreLine $gitignore $requiredIgnore)) {
        Write-Host "Missing: $gitignore entry $requiredIgnore"
        $script:Drift = $true
    }
}

$actualState = if (Test-Path -LiteralPath $InstallState -PathType Leaf) {
    (Get-Content -LiteralPath $InstallState -Raw -Encoding utf8).Replace("`r`n", "`n")
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

if ($Mode -eq "Link") {
    foreach ($destination in @($script:ReplaceLinks + $script:StaleEntries)) {
        Remove-DirectoryLink $destination
        Write-Host "Removed: $destination"
    }
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
    Remove-DirectoryLink $skillsDestination
    New-Item -ItemType Directory -Path $skillsDestination | Out-Null
    Write-Host "Migrated: $skillsDestination from whole-directory link to flat skill entries"
} elseif (-not (Test-PathExists $skillsDestination)) {
    New-Item -ItemType Directory -Path $skillsDestination | Out-Null
}

if ($Mode -eq "Copy") {
    Update-CopiedFiles
} else {
    foreach ($skill in $skillSources) {
        Install-SharedDirectory $skill.Source (Join-Path $skillsDestination $skill.Name)
    }
    Install-SharedDirectory $rulesSource $rulesDestination
}
Write-InstallState

Write-Host "Agent project initialization complete."
exit 0
