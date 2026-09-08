param ([string]$PowerShell = (Get-Process -Id $PID).Path)

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
        $null = & $PowerShell -NoProfile -File $SetupScript @Arguments
        $code = $LASTEXITCODE
        $global:LASTEXITCODE = 0
        return $code
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

    [System.IO.Directory]::Delete((Join-Path $Skills "tdd"))
    Assert-True ((Invoke-Setup @("-Action", "Check", "-Mode", "Link", "-Channel", "Stable")) -eq 2) "Missing skill did not report drift"
    Assert-True ((Invoke-Setup @("-Action", "Sync", "-Mode", "Link", "-Channel", "Stable")) -eq 0) "Missing skill was not restored"

    New-Item -ItemType Directory -Path (Join-Path $Skills "project-local") | Out-Null
    Set-Content -LiteralPath (Join-Path $Skills "project-local\SKILL.md") -Value "local"
    Assert-True ((Invoke-Setup @("-Action", "Uninstall", "-Mode", "Link", "-Channel", "Stable")) -eq 0) "Uninstall failed"
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $Skills "tdd"))) "Managed skill survived uninstall"
    Assert-True (Test-Path -LiteralPath (Join-Path $Skills "project-local\SKILL.md")) "Project-local skill was removed"
    Assert-True (Test-Path -LiteralPath (Join-Path $Agents "CONTEXT.md")) "Project context was removed"
} finally {
    $temp = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
    if (-not [System.IO.Path]::GetFullPath($Project).StartsWith($temp, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Unsafe test cleanup path: $Project"
    }
    $links = @()
    if (Test-Path -LiteralPath "$Project/.agents/skills") {
        $links += @(Get-ChildItem -LiteralPath "$Project/.agents/skills" -Force | Where-Object { $_.LinkType -in @("Junction", "SymbolicLink") })
    }
    if (Test-Path -LiteralPath "$Project/.agents/rules") {
        $links += @(Get-Item -LiteralPath "$Project/.agents/rules" -Force | Where-Object { $_.LinkType -in @("Junction", "SymbolicLink") })
    }
    foreach ($link in $links) { [System.IO.Directory]::Delete($link.FullName) }
    Remove-Item -LiteralPath $Project -Recurse -Force -ErrorAction SilentlyContinue
}

$global:LASTEXITCODE = 0
