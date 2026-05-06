<#
.SYNOPSIS
  Copia credito-app → public/credito-app al guardar (JS/CSS), sin bump de ?v=.

.DESCRIPTION
  Pendientes es rápido porque editás un solo archivo y recargás. Crédito antes obligaba a
  ejecutar sync-credito-public.ps1 tras cada cambio. Este watcher deja el deploy actualizado
  en caliente; en localhost (o ?fastreload=1) credito.html ya usa ?t= en los assets — un F5 basta.

.EXAMPLE
  .\scripts\watch-credito-public.ps1
#>
[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$srcDir = Join-Path $root "credito-app"
$dstDir = Join-Path $root "public\credito-app"

if (-not (Test-Path -LiteralPath $srcDir)) {
  Write-Error "No existe: $srcDir"
}

$null = New-Item -ItemType Directory -Force -Path $dstDir

$watcher = New-Object System.IO.FileSystemWatcher $srcDir, "*"
$watcher.IncludeSubdirectories = $true
$watcher.NotifyFilter = [System.IO.NotifyFilters]::LastWrite -bor [System.IO.NotifyFilters]::FileName

$handler = {
  $path = $Event.SourceEventArgs.FullPath
  $name = $Event.SourceEventArgs.Name
  if ($name -match '\\node_modules\\') { return }
  $ext = [System.IO.Path]::GetExtension($path).ToLowerInvariant()
  if ($ext -notin @(".js", ".css", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".txt")) { return }
  $srcRoot = $using:srcDir
  $dstRoot = $using:dstDir
  if (-not $path.StartsWith($srcRoot, [System.StringComparison]::OrdinalIgnoreCase)) { return }
  $rel = $path.Substring($srcRoot.Length).TrimStart('\').TrimStart('/')
  Start-Sleep -Milliseconds 120
  try {
    $from = Join-Path $srcRoot $rel
    $to = Join-Path $dstRoot $rel
    if (-not (Test-Path -LiteralPath $from)) { return }
    $parent = Split-Path $to -Parent
    if (-not (Test-Path -LiteralPath $parent)) {
      $null = New-Item -ItemType Directory -Force -Path $parent
    }
    Copy-Item -LiteralPath $from -Destination $to -Force
    Write-Host ("[{0:HH:mm:ss}] {1}" -f (Get-Date), $rel)
  } catch {
    Write-Warning $_
  }
}

Register-ObjectEvent $watcher Changed -Action $handler | Out-Null
Register-ObjectEvent $watcher Created -Action $handler | Out-Null

Write-Host "Observando $srcDir → $dstDir (Ctrl+C para salir)."
Write-Host "Abrí http://localhost:.../credito con servidor sirviendo public/ — F5 recarga el bundle."

try {
  while ($true) { Start-Sleep -Seconds 3600 }
} finally {
  $watcher.Dispose()
}
