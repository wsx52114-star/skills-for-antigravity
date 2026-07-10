# 1. 定義 Skills 倉庫的絕對路徑 (預設在家目錄下，可依需求調整)
$SKILLS_REPO = "$HOME\skills-for-antigravity"

# 2. 建立專案目錄結構
New-Item -ItemType Directory -Force -Path ".agents\rules" | Out-Null
New-Item -ItemType Directory -Force -Path ".agents\skills" | Out-Null

# 3. 軟連結技能觸發規則 (優先用 Symlink，失敗則改用 Hardlink 或直接複製)
$ruleDest = ".agents\rules\skills.md"
if (Test-Path $ruleDest) { Remove-Item -Force $ruleDest }

try {
    New-Item -ItemType SymbolicLink -Force -Path $ruleDest -Value "$SKILLS_REPO\rules\skills.md" -ErrorAction Stop | Out-Null
} catch {
    try {
        New-Item -ItemType HardLink -Force -Path $ruleDest -Value "$SKILLS_REPO\rules\skills.md" -ErrorAction Stop | Out-Null
    } catch {
        Copy-Item -Force -Path "$SKILLS_REPO\rules\skills.md" -Destination $ruleDest
    }
}

# 4. 扁平化建立接合點 (Junction) 連結所有 Skills 工具組 (免管理員權限)
Get-ChildItem -Path "$SKILLS_REPO\skills" -Filter "SKILL.md" -Recurse | Where-Object {
    $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch "deprecated"
} | ForEach-Object {
    $src = $_.Directory.FullName
    $name = $_.Directory.Name
    $linkPath = ".agents\skills\$name"
    if (Test-Path $linkPath) { Remove-Item -Recurse -Force $linkPath }
    New-Item -ItemType Junction -Path $linkPath -Value $src | Out-Null
}

Write-Host "✅ 技能連結完成！"