param(
  [Parameter(Mandatory = $true)] [string]$ExtensionDir,
  [Parameter(Mandatory = $true)] [string]$OutputDir,
  [Parameter(Mandatory = $true)] [string]$ExtensionId,
  [Parameter(Mandatory = $true)] [string]$BaseCodebaseUrl,
  [string]$ChromePath,
  [string]$KeyPath
)

$ErrorActionPreference = 'Stop'

function Resolve-ChromePath {
  param([string]$Provided)
  if ($Provided -and (Test-Path $Provided)) { return $Provided }

  $candidates = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe",
    "$env:LocalAppData\Google\Chrome\Application\chrome.exe"
  )

  foreach ($p in $candidates) {
    if (Test-Path $p) { return $p }
  }

  throw "Chrome bulunamadi. -ChromePath parametresi verin."
}

$ext = Resolve-Path $ExtensionDir
$out = Resolve-Path $OutputDir -ErrorAction SilentlyContinue
if (-not $out) {
  New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
  $out = Resolve-Path $OutputDir
}

$chrome = Resolve-ChromePath -Provided $ChromePath
$manifestPath = Join-Path $ext 'manifest.json'
if (-not (Test-Path $manifestPath)) { throw "manifest.json bulunamadi: $manifestPath" }

$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$version = $manifest.version
if (-not $version) { throw 'Manifest version bos.' }

$packArgs = @("--pack-extension=$ext")
if ($KeyPath) {
  if (-not (Test-Path $KeyPath)) { throw "PEM bulunamadi: $KeyPath" }
  $packArgs += "--pack-extension-key=$KeyPath"
}

Write-Host "[1/4] Packing extension..."
& $chrome @packArgs
if ($LASTEXITCODE -ne 0) {
  throw "Chrome pack işlemi başarısız oldu. ExitCode=$LASTEXITCODE"
}

$generatedCrx = "$ext.crx"
$generatedPem = "$ext.pem"
if (-not (Test-Path $generatedCrx)) {
  throw "CRX üretilemedi: $generatedCrx"
}

$releaseCrxName = "av-yusuf-avci-uyap-$version.crx"
$releaseCrxPath = Join-Path $out $releaseCrxName
Move-Item -Path $generatedCrx -Destination $releaseCrxPath -Force

if ((-not $KeyPath) -and (Test-Path $generatedPem)) {
  $savedPemPath = Join-Path $out 'extension-private-key.pem'
  Move-Item -Path $generatedPem -Destination $savedPemPath -Force
  Write-Host "[2/4] Yeni PEM kaydedildi: $savedPemPath"
} else {
  Write-Host "[2/4] Mevcut PEM kullanildi."
}

$normalizedBase = $BaseCodebaseUrl.TrimEnd('/')
$codebaseUrl = "$normalizedBase/$releaseCrxName"

$updatesXml = @"
<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='$ExtensionId'>
    <updatecheck codebase='$codebaseUrl' version='$version' />
  </app>
</gupdate>
"@

$updatesXmlPath = Join-Path $out 'updates.xml'
Set-Content -Path $updatesXmlPath -Value $updatesXml -Encoding UTF8

Write-Host "[3/4] updates.xml üretildi: $updatesXmlPath"
Write-Host "[4/4] CRX hazır: $releaseCrxPath"
Write-Host "Tamamlandi."

