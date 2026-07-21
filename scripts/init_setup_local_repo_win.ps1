param (
    [string]$Mode = ""
)

$ErrorActionPreference = "Stop"
$SkillsRepo = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$ProjectRoot = (Get-Location).Path
$AgentsDir = Join-Path $ProjectRoot ".agents"

function Get-NormalizedPath {
    param ([string]$Path)
    return [System.IO.Path]::GetFullPath($Path).TrimEnd('\', '/')
}

function Test-PathExists {
    param ([string]$Path)
    return Test-Path -LiteralPath $Path
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

    if (-not (Test-PathExists $Destination)) { return }

    $item = Get-Item -LiteralPath $Destination -Force
    if ($item.LinkType -notin @("Junction", "SymbolicLink")) {
        throw "Refusing to replace an existing file or directory: $Destination"
    }

    $target = [string]$item.Target
    if (-not [System.IO.Path]::IsPathRooted($target)) {
        $target = Join-Path $item.Parent.FullName $target
    }

    if ((Get-NormalizedPath $target) -ne (Get-NormalizedPath $Source)) {
        throw "Existing link points to '$target'; expected '$Source': $Destination"
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
            Assert-DirectorySlot $destination
        }
    }
}
if ($Mode -eq "Link") {
    Assert-LinkSlot $rulesSource $rulesDestination
} else {
    Assert-DirectorySlot $rulesDestination
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
'@

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

Write-Host "Agent project initialization complete."
