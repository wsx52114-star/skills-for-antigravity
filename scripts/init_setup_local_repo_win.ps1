param (
    [string]$Mode = "" # "Copy" or "Link"
)

# 1. 定義 Skills 倉庫的絕對路徑 (預設在家目錄下，可依需求調整)
$SKILLS_REPO = "$HOME\skills-for-antigravity"

# 驗證路徑是否存在，如果不存在則報錯退出
if (-not (Test-Path -Path $SKILLS_REPO -PathType Container)) {
    Write-Error "Error: Skills repository directory not found at: $SKILLS_REPO"
    Write-Warning "Please check the `$SKILLS_REPO path defined in this script."
    exit 1
}

$ruleSource = "$SKILLS_REPO\rules\skills.md"
if (-not (Test-Path -Path $ruleSource -PathType Leaf)) {
    Write-Error "Error: Source rules file not found at: $ruleSource"
    exit 1
}

# 若未指定 Mode 參數，則啟動互動式選單讓使用者選擇
if ($null -eq $Mode -or $Mode -eq "") {
    Write-Host "========================================="
    Write-Host "  Antigravity Agent Skills Setup (Windows)"
    Write-Host "========================================="
    Write-Host "Please select installation mode:"
    Write-Host "  [1] Copy Mode (Recommended - Full GUI/Slash Command select list, but needs re-run to update)"
    Write-Host "  [2] Link Mode (NTFS Junctions - auto-syncs on git pull, but custom skills won't show in IDE / menu)"
    Write-Host "========================================="
    $choice = Read-Host "Enter option [1 or 2, default is 1]"
    
    if ($choice -eq "2") {
        $Mode = "Link"
    } else {
        $Mode = "Copy"
    }
}

if ($Mode -notin @("Copy", "Link")) {
    Write-Error "Invalid mode. Please use 'Copy' or 'Link'."
    exit 1
}

# 2. 建立專案目錄結構
New-Item -ItemType Directory -Force -Path ".agents" | Out-Null
New-Item -ItemType Directory -Force -Path ".agents\skills" | Out-Null

# 3. 複製並翻譯技能觸發規則為專案專屬的 AGENTS.md (替換全域路徑為本機相對路徑)
$agentsDest = ".agents\AGENTS.md"
if (Test-Path $agentsDest) { Remove-Item -Force $agentsDest }

# 顯式指定 -Encoding utf8 以防止 Windows PowerShell (v5.1) 以 ANSI 讀寫導致中文字元亂碼
(Get-Content -Raw -Encoding utf8 -Path $ruleSource) -replace '~/.gemini/config/skills/', '.agents/skills/' | Set-Content -Encoding utf8 -Path $agentsDest

# 4. 扁平化建立連結或複製所有 Skills 工具組
Write-Host "Installing skills in $Mode mode..."
Get-ChildItem -Path "$SKILLS_REPO\skills" -Filter "SKILL.md" -Recurse | Where-Object {
    $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch "deprecated"
} | ForEach-Object {
    $src = $_.Directory.FullName
    $name = $_.Directory.Name
    $linkPath = ".agents\skills\$name"
    if (Test-Path $linkPath) { Remove-Item -Recurse -Force $linkPath }
    
    if ($Mode -eq "Link") {
        New-Item -ItemType Junction -Path $linkPath -Value $src | Out-Null
    } else {
        Copy-Item -Recurse -Force -Path $src -Destination $linkPath | Out-Null
    }
}

if ($Mode -eq "Link") {
    Write-Host "Success: Skills linked and AGENTS.md initialized successfully!"
} else {
    Write-Host "Success: Skills copied and AGENTS.md initialized successfully!"
}