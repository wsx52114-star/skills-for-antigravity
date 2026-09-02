$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..\..\..")).Path
$SetupScript = Join-Path $RepoRoot "scripts\init_setup_local_repo_win.ps1"
$Project = Join-Path ([System.IO.Path]::GetTempPath()) ("antigravity-project-" + [guid]::NewGuid())

function Assert-True {
    param ([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

function Invoke-Setup {
    param ([string[]]$Arguments)
    Push-Location $Project
    try {
        $null = & pwsh -NoProfile -File $SetupScript @Arguments
        return $LASTEXITCODE
    } finally {
        Pop-Location
    }
}

try {
    New-Item -ItemType Directory -Path $Project | Out-Null
    Assert-True ((Invoke-Setup @("-Action", "Sync", "-Mode", "Link", "-Channel", "Stable")) -eq 0) "Stable sync failed"

    $Agents = Join-Path $Project ".agents"
    $Skills = Join-Path $Agents "skills"
    Assert-True (Test-Path -LiteralPath (Join-Path $Skills "tdd")) "Stable skill was not linked"
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $Skills "implement-spec"))) "In-progress skill was linked in Stable channel"
    Assert-True ((Get-Content -LiteralPath (Join-Path $Agents ".install-state") -Raw) -match "(?m)^channel=stable$") "Install state did not record Stable channel"
    Assert-True ((Invoke-Setup @("-Action", "Check", "-Mode", "Link", "-Channel", "Stable")) -eq 0) "Current installation was reported as drifted"

    Remove-Item -LiteralPath (Join-Path $Skills "tdd") -Force
    Assert-True ((Invoke-Setup @("-Action", "Check", "-Mode", "Link", "-Channel", "Stable")) -eq 2) "Missing skill did not report drift"
    Assert-True ((Invoke-Setup @("-Action", "Sync", "-Mode", "Link", "-Channel", "Stable")) -eq 0) "Missing skill was not restored"

    New-Item -ItemType Directory -Path (Join-Path $Skills "project-local") | Out-Null
    Set-Content -LiteralPath (Join-Path $Skills "project-local\SKILL.md") -Value "local"
    Assert-True ((Invoke-Setup @("-Action", "Uninstall", "-Mode", "Link", "-Channel", "Stable")) -eq 0) "Uninstall failed"
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $Skills "tdd"))) "Managed skill survived uninstall"
    Assert-True (Test-Path -LiteralPath (Join-Path $Skills "project-local\SKILL.md")) "Project-local skill was removed"
    Assert-True (Test-Path -LiteralPath (Join-Path $Agents "CONTEXT.md")) "Project context was removed"
} finally {
    Remove-Item -LiteralPath $Project -Recurse -Force -ErrorAction SilentlyContinue
}
