<#
.SYNOPSIS
  Copia credito-app/ → public/credito-app/ y sube ?v= en credito.html (raíz y public/) para cache-bust.

.DESCRIPTION
  Un solo paso tras editar JS/CSS en credito-app: sincroniza el deploy bajo public/ y fuerza recarga en navegador.

.EXAMPLE
  .\scripts\sync-credito-public.ps1
  .\scripts\sync-credito-public.ps1 -WhatIf
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param()

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$src = Join-Path $root "credito-app"
$dst = Join-Path $root "public\credito-app"

if (-not (Test-Path -LiteralPath $src)) {
  Write-Error "No existe la carpeta: $src"
}

if ($WhatIfPreference) {
  Write-Host "[WhatIf] Robocopy $src -> $dst"
} else {
  $null = New-Item -ItemType Directory -Force -Path $dst
  # Robocopy: 0-7 = éxito; >=8 error. /E copia todo; no borra huérfanos en destino (usar /MIR solo si querés espejo exacto).
  & robocopy $src $dst /E /IS /IT /XD node_modules /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
  $rc = $LASTEXITCODE
  if ($rc -ge 8) {
    Write-Error "robocopy falló con código $rc"
  }
  Write-Host "Sincronizado: $src -> $dst (robocopy exit $rc)"
}

$stamp = Get-Date -Format "yyyyMMddHHmmss"
$htmlFiles = @(
  (Join-Path $root "credito.html"),
  (Join-Path $root "public\credito.html")
)

$utf8NoBom = New-Object System.Text.UTF8Encoding $false

foreach ($f in $htmlFiles) {
  if (-not (Test-Path -LiteralPath $f)) {
    Write-Warning "Omitido (no existe): $f"
    continue
  }
  $raw = [System.IO.File]::ReadAllText($f, $utf8NoBom)
  $next = [regex]::Replace(
    $raw,
    '(credito-app\.js\?v=)[^"''&]+',
    { param($m) $m.Groups[1].Value + $stamp },
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
  )
  $next = [regex]::Replace(
    $next,
    '(credito-app\.css\?v=)[^"''&]+',
    { param($m) $m.Groups[1].Value + $stamp },
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
  )
  if ($next -eq $raw) {
    Write-Warning "No se encontraron query credito-app.js|css ?v= en: $f"
  }
  if ($WhatIfPreference) {
    Write-Host "[WhatIf] Bump ?v=$stamp en $(Split-Path $f -Leaf)"
    continue
  }
  [System.IO.File]::WriteAllText($f, $next, $utf8NoBom)
  Write-Host "Actualizado ?v=$stamp - $(Split-Path $f -Leaf)"
}

Write-Host "Listo. Siguiente: commit / deploy si aplica."
