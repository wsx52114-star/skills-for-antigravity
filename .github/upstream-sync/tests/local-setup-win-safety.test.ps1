param (
    [string]$PowerShell = (Get-Process -Id $PID).Path,
    [string]$Scenario = "*"
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "../../..")).Path

function Assert-True {
    param ([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

function Invoke-Setup {
    param ([string]$Project, [string]$Installer, [string]$Action = "Sync", [string]$Mode = "Copy", [string]$Channel = "All")
    Push-Location $Project
    try {
        $ErrorActionPreference = "Continue"
        $output = & $PowerShell -NoProfile -File $Installer -Action $Action -Mode $Mode -Channel $Channel 2>&1
        $code = $LASTEXITCODE
        $global:LASTEXITCODE = 0
        return [PSCustomObject]@{ Code = $code; Output = ($output -join "`n") }
    } finally { Pop-Location }
}

function Test-Scenario {
    param ([string]$Name, [scriptblock]$Body)
    if ($Name -notlike $Scenario) { return }
    $temp = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
    $root = Join-Path $temp ("antigravity-safety-" + [guid]::NewGuid())
    $source = Join-Path $root "source"
    $project = Join-Path $root "project"
    try {
        New-Item -ItemType Directory -Path "$source/scripts", "$source/skills/engineering/demo", "$source/rules", $project | Out-Null
        Copy-Item -LiteralPath "$RepoRoot/scripts/init_setup_local_repo_win.ps1" -Destination "$source/scripts/setup.ps1"
        Set-Content -LiteralPath "$source/skills/engineering/demo/SKILL.md" -Value "upstream-v1"
        Set-Content -LiteralPath "$source/rules/skills.md" -Value "rule-v1"
        & $Body $project $source "$source/scripts/setup.ps1"
        Write-Host "PASS: $Name"
    } finally {
        if (-not [System.IO.Path]::GetFullPath($root).StartsWith($temp, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Unsafe test cleanup path: $root"
        }
        Remove-Item -LiteralPath $root -Recurse -Force
    }
}

Test-Scenario "Uninstall rejects a linked .agents directory without changing its target" {
    param ($project, $source, $installer)
    Assert-True ((Invoke-Setup $project $installer).Code -eq 0) "Initial copy failed"
    $other = Join-Path (Split-Path $project) "other"
    New-Item -ItemType Directory -Path $other | Out-Null
    New-Item -ItemType Junction -Path "$other/.agents" -Target "$project/.agents" | Out-Null
    try {
        $result = Invoke-Setup $other $installer "Uninstall"
        Assert-True ($result.Code -ne 0) "Uninstall accepted a linked project directory"
        Assert-True (Test-Path -LiteralPath "$project/.agents/skills/demo/SKILL.md") "Another project's skill was deleted"
        Assert-True (Test-Path -LiteralPath "$project/.agents/rules/skills.md") "Another project's rules were deleted"
    } finally { [System.IO.Directory]::Delete("$other/.agents") }
}

Test-Scenario "Copy sync and uninstall preserve local edits before changing any managed file" {
    param ($project, $source, $installer)
    Assert-True ((Invoke-Setup $project $installer).Code -eq 0) "Initial copy failed"
    Set-Content -LiteralPath "$project/.agents/skills/demo/SKILL.md" -Value "local-edit"
    Set-Content -LiteralPath "$source/rules/skills.md" -Value "rule-v2"
    Assert-True ((Invoke-Setup $project $installer "Check").Code -eq 2) "Check missed a local edit"
    foreach ($action in @("Sync", "Uninstall")) {
        $result = Invoke-Setup $project $installer $action
        Assert-True ($result.Code -ne 0) "$action accepted a local edit"
        Assert-True ((Get-Content -LiteralPath "$project/.agents/skills/demo/SKILL.md" -Raw).Trim() -eq "local-edit") "$action lost the local edit"
        Assert-True ((Get-Content -LiteralPath "$project/.agents/rules/skills.md" -Raw).Trim() -eq "rule-v1") "$action changed files before resolving conflicts"
    }
}

Test-Scenario "Copy checks content, updates clean files, and preserves extra files through uninstall" {
    param ($project, $source, $installer)
    $src = "$source/skills/engineering/demo"
    $dst = "$project/.agents/skills/demo"
    Set-Content -LiteralPath "$src/removed.txt" -Value "old"
    Assert-True ((Invoke-Setup $project $installer).Code -eq 0) "Initial copy failed"
    Assert-True ((Invoke-Setup $project $installer "Check").Code -eq 0) "Fresh copy reported drift"
    Set-Content -LiteralPath "$dst/local.txt" -Value "keep"
    Set-Content -LiteralPath "$src/SKILL.md" -Value "upstream-v2"
    Remove-Item -LiteralPath "$src/removed.txt"
    Set-Content -LiteralPath "$src/added.txt" -Value "new"
    Assert-True ((Invoke-Setup $project $installer "Check").Code -eq 2) "Check missed upstream changes"
    Assert-True ((Invoke-Setup $project $installer).Code -eq 0) "Clean update failed"
    Assert-True ((Get-Content -LiteralPath "$dst/SKILL.md" -Raw).Trim() -eq "upstream-v2") "Content was not updated"
    Assert-True (-not (Test-Path -LiteralPath "$dst/removed.txt")) "Removed upstream file survived sync"
    Assert-True (Test-Path -LiteralPath "$dst/added.txt") "Added upstream file missing"
    Assert-True ((Invoke-Setup $project $installer "Check").Code -eq 0) "Updated copy reported drift"
    $uninstall = Invoke-Setup $project $installer "Uninstall"
    Assert-True ($uninstall.Code -eq 0) "Clean uninstall failed: $($uninstall.Output)"
    Assert-True ((Get-Content -LiteralPath "$dst/local.txt" -Raw).Trim() -eq "keep") "Uninstall deleted an extra file"
    Assert-True (-not (Test-Path -LiteralPath "$dst/SKILL.md")) "Uninstall left managed content"
    Assert-True (Test-Path -LiteralPath "$project/.agents/CONTEXT.md") "Uninstall deleted project knowledge"
}

Test-Scenario "Copy rejects existing unmanaged directories and legacy baselines" {
    param ($project, $source, $installer)
    New-Item -ItemType Directory -Path "$project/.agents/skills/demo" -Force | Out-Null
    Set-Content -LiteralPath "$project/.agents/skills/demo/SKILL.md" -Value "local"
    Assert-True ((Invoke-Setup $project $installer).Code -ne 0) "An unmanaged directory was adopted"
    Set-Content -LiteralPath "$project/.agents/.install-state" -Value @("version=1", "mode=copy", "source=$source", "skill=demo")
    foreach ($action in @("Sync", "Uninstall")) {
        Assert-True ((Invoke-Setup $project $installer $action).Code -ne 0) "$action accepted a missing baseline"
        Assert-True ((Get-Content -LiteralPath "$project/.agents/skills/demo/SKILL.md" -Raw).Trim() -eq "local") "$action changed legacy content"
    }
}

Test-Scenario "Copy rejects nested junctions and foreign installation sources" {
    param ($project, $source, $installer)
    Assert-True ((Invoke-Setup $project $installer).Code -eq 0) "Initial copy failed"
    New-Item -ItemType Junction -Path "$project/.agents/skills/demo/external" -Target "$source/rules" | Out-Null
    try {
        foreach ($action in @("Sync", "Uninstall")) {
            Assert-True ((Invoke-Setup $project $installer $action).Code -ne 0) "$action accepted a nested junction"
        }
        Assert-True (Test-Path -LiteralPath "$source/rules/skills.md") "Source rules were changed"
    } finally { [System.IO.Directory]::Delete("$project/.agents/skills/demo/external") }
    $state = "$project/.agents/.install-state"
    (Get-Content -LiteralPath $state) -replace '^source=.*$', 'source=C:\unrelated-agent-home' | Set-Content -LiteralPath $state
    Assert-True ((Invoke-Setup $project $installer "Uninstall").Code -ne 0) "Foreign ownership was ignored"
    Assert-True (Test-Path -LiteralPath "$project/.agents/skills/demo/SKILL.md") "Foreign installation was deleted"
}

Test-Scenario "Git ignore comments and negations do not count as installed ignore rules" {
    param ($project, $source, $installer)
    Assert-True ((Invoke-Setup $project $installer).Code -eq 0) "Initial copy failed"
    $ignore = "$project/.agents/.gitignore"
    Set-Content -LiteralPath $ignore -Value @("# /skills", "/rules-backup", "# /.install-state", "!/skills", "!/rules", "!/.install-state")
    Assert-True ((Invoke-Setup $project $installer "Check").Code -eq 2) "Comments were mistaken for ignore rules"
    Assert-True ((Invoke-Setup $project $installer).Code -eq 0) "Ignore repair failed"
    Assert-True ((Invoke-Setup $project $installer "Check").Code -eq 0) "Ignore rules remain drifted"
    & git -C $project init --quiet
    foreach ($relative in @(".agents/skills/demo/SKILL.md", ".agents/rules/skills.md", ".agents/.install-state")) {
        & git -C $project check-ignore --quiet -- $relative
        Assert-True ($LASTEXITCODE -eq 0) "Git does not ignore $relative"
    }
}

Test-Scenario "Link channel changes and moved skills unlink only the old entries" {
    param ($project, $source, $installer)
    New-Item -ItemType Directory -Path "$source/skills/in-progress/draft" | Out-Null
    Set-Content -LiteralPath "$source/skills/in-progress/draft/SKILL.md" -Value "draft"
    Assert-True ((Invoke-Setup $project $installer "Sync" "Link" "All").Code -eq 0) "All-channel sync failed"
    Assert-True ((Invoke-Setup $project $installer "Check" "Link" "Stable").Code -eq 2) "Channel drift was missed"
    $sync = Invoke-Setup $project $installer "Sync" "Link" "Stable"
    Assert-True ($sync.Code -eq 0) "Stable sync failed: $($sync.Output)"
    Assert-True (-not (Test-Path -LiteralPath "$project/.agents/skills/draft")) "Draft link survived Stable sync"
    Assert-True (Test-Path -LiteralPath "$source/skills/in-progress/draft/SKILL.md") "Unlink deleted source content"
    New-Item -ItemType Directory -Path "$source/skills/misc/demo" | Out-Null
    Copy-Item -LiteralPath "$source/skills/engineering/demo/SKILL.md" -Destination "$source/skills/misc/demo/SKILL.md"
    Remove-Item -LiteralPath "$source/skills/engineering/demo/SKILL.md"
    Remove-Item -LiteralPath "$source/skills/engineering/demo"
    Assert-True ((Invoke-Setup $project $installer "Check" "Link" "Stable").Code -eq 2) "Moved skill drift was missed"
    $sync = Invoke-Setup $project $installer "Sync" "Link" "Stable"
    Assert-True ($sync.Code -eq 0) "Moved skill sync failed: $($sync.Output)"
    Assert-True ((Invoke-Setup $project $installer "Check" "Link" "Stable").Code -eq 0) "Moved skill was not repaired"
    Assert-True ((Invoke-Setup $project $installer "Uninstall" "Link" "Stable").Code -eq 0) "Link uninstall failed"
    Assert-True (Test-Path -LiteralPath "$source/skills/misc/demo/SKILL.md") "Link uninstall deleted source content"
}

Test-Scenario "Uninstall rejects a linked skills container" {
    param ($project, $source, $installer)
    Assert-True ((Invoke-Setup $project $installer).Code -eq 0) "Initial copy failed"
    $other = Join-Path (Split-Path $project) "other"
    New-Item -ItemType Directory -Force -Path "$other/.agents" | Out-Null
    New-Item -ItemType Junction -Path "$other/.agents/skills" -Target "$project/.agents/skills" | Out-Null
    try {
        Assert-True ((Invoke-Setup $other $installer "Uninstall").Code -ne 0) "Uninstall accepted a linked skills container"
        Assert-True (Test-Path -LiteralPath "$project/.agents/skills/demo/SKILL.md") "Another project's skill was deleted"
    } finally { [System.IO.Directory]::Delete("$other/.agents/skills") }
}

Test-Scenario "Copy detects a file blocking a new parent directory before any update" {
    param ($project, $source, $installer)
    Assert-True ((Invoke-Setup $project $installer).Code -eq 0) "Initial copy failed"
    Set-Content -LiteralPath "$project/.agents/skills/demo/nested" -Value "local"
    New-Item -ItemType Directory -Path "$source/skills/engineering/demo/nested" | Out-Null
    Set-Content -LiteralPath "$source/skills/engineering/demo/nested/new.txt" -Value "new"
    Set-Content -LiteralPath "$source/rules/skills.md" -Value "rule-v2"
    Assert-True ((Invoke-Setup $project $installer "Check").Code -eq 1) "Check did not identify a parent path conflict"
    Assert-True ((Invoke-Setup $project $installer).Code -eq 1) "Sync accepted a parent path conflict"
    Assert-True ((Get-Content -LiteralPath "$project/.agents/rules/skills.md" -Raw).Trim() -eq "rule-v1") "Sync changed files before preflight finished"
    Assert-True ((Get-Content -LiteralPath "$project/.agents/skills/demo/nested" -Raw).Trim() -eq "local") "Sync changed the blocking local file"
}

$global:LASTEXITCODE = 0
