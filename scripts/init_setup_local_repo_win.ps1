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

# Preflight every destination before creating or changing anything.
Assert-DirectorySlot $AgentsDir
Assert-DirectorySlot (Join-Path $AgentsDir "docs")
Assert-DirectorySlot (Join-Path $AgentsDir "docs\adr")
Assert-FileSlot (Join-Path $AgentsDir "AGENTS.md")
Assert-FileSlot (Join-Path $AgentsDir "CONTEXT.md")
Assert-FileSlot (Join-Path $AgentsDir ".gitignore")
if ($Mode -eq "Link") {
    Assert-LinkSlot $skillsSource $skillsDestination
    Assert-LinkSlot $rulesSource $rulesDestination
} else {
    Assert-DirectorySlot $skillsDestination
    Assert-DirectorySlot $rulesDestination
}

New-Item -ItemType Directory -Force -Path (Join-Path $AgentsDir "docs\adr") | Out-Null

Write-FileIfMissing (Join-Path $AgentsDir "AGENTS.md") @'
# Project Agent Instructions

Before non-trivial work:

1. Read `.agents/rules/skills.md`.
2. Read `.agents/CONTEXT.md` when domain language matters.
3. Read relevant decisions under `.agents/docs/adr/`.
4. Keep project knowledge inside this project.
'@

Write-FileIfMissing (Join-Path $AgentsDir "CONTEXT.md") @'
# Project Context

Project-specific domain language and relationships belong here.
'@

Write-FileIfMissing (Join-Path $AgentsDir ".gitignore") @'
# Machine-local shared Agent home links
/skills
/rules
'@

Install-SharedDirectory $skillsSource $skillsDestination $Mode
Install-SharedDirectory $rulesSource $rulesDestination $Mode

Write-Host "Agent project initialization complete."
