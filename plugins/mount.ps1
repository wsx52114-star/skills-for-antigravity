param(
  [string]$ConfigPath = (Join-Path $HOME '.gemini\config\plugins.json')
)

$ErrorActionPreference = 'Stop'
$target = $PSScriptRoot -replace '\\', '/'
New-Item -ItemType Directory -Force (Split-Path $ConfigPath) | Out-Null
$raw = if (Test-Path $ConfigPath) { [IO.File]::ReadAllText($ConfigPath).Trim() } else { '' }
$doc = if ($raw) { $raw | ConvertFrom-Json } else { [pscustomobject]@{} }
$entries = @($doc.entries | Where-Object { $_ })
if (-not ($entries | Where-Object { ("$($_.path)" -replace '\\', '/').TrimEnd('/') -eq $target })) {
  $entries += [pscustomobject]@{ path = $target }
}
$doc | Add-Member -Force entries @($entries)
[IO.File]::WriteAllText($ConfigPath, ($doc | ConvertTo-Json -Depth 10) + "`n", [Text.UTF8Encoding]::new($false))
Write-Host "Mounted $target -> $ConfigPath"
