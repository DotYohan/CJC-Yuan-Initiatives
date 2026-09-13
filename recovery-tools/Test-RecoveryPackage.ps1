[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$ArchivePath,
    [Parameter(Mandatory)][string]$ChecksumPath,
    [string]$ExtractAndVerifyTo = ''
)

. (Join-Path $PSScriptRoot 'Common.ps1')
$sevenZip = 'C:\Program Files\7-Zip\7z.exe'
Assert-CommandPath -Path $sevenZip -Label '7-Zip'
Assert-CommandPath -Path $ArchivePath -Label 'Recovery archive'
Assert-CommandPath -Path $ChecksumPath -Label 'Archive checksum'

$checksumLine = (Get-Content -LiteralPath $ChecksumPath | Where-Object { $_.Trim() } | Select-Object -First 1).Trim()
if ($checksumLine -notmatch '^([0-9a-fA-F]{64})\s{2}(.+)$') { throw 'Checksum sidecar format is invalid.' }
$expected = $Matches[1].ToLowerInvariant()
$expectedName = $Matches[2]
if ($expectedName -ne [IO.Path]::GetFileName($ArchivePath)) { throw 'Checksum sidecar names a different archive.' }
$actual = (Get-FileHash -LiteralPath $ArchivePath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actual -ne $expected) { throw 'Downloaded archive SHA-256 checksum does not match.' }
Write-Host 'Outer archive checksum: PASS'

Write-Host 'Enter the archive password when 7-Zip asks.'
& $sevenZip t $ArchivePath -p
if ($LASTEXITCODE -ne 0) { throw '7-Zip integrity/password test failed.' }
Write-Host 'Encrypted archive integrity: PASS'

if ($ExtractAndVerifyTo) {
    Assert-EmptyOrMissingDirectory -Path $ExtractAndVerifyTo
    New-Item -ItemType Directory -Path $ExtractAndVerifyTo | Out-Null
    & $sevenZip x $ArchivePath "-o$ExtractAndVerifyTo" -p
    if ($LASTEXITCODE -ne 0) { throw 'Archive extraction failed.' }
    $bundle = Get-ChildItem -LiteralPath $ExtractAndVerifyTo -Directory | Where-Object Name -like 'CJC-Recovery-*' | Select-Object -First 1
    if (-not $bundle) { throw 'Extracted archive does not contain the expected recovery directory.' }
    $manifest = Join-Path $bundle.FullName 'verification\SHA256SUMS.txt'
    Assert-CommandPath -Path $manifest -Label 'Internal checksum manifest'
    foreach ($line in Get-Content -LiteralPath $manifest) {
        if (-not $line.Trim()) { continue }
        if ($line -notmatch '^([0-9a-f]{64})\s{2}(.+)$') { throw "Invalid internal checksum line: $line" }
        $file = Join-Path $bundle.FullName ($Matches[2].Replace('/', '\'))
        if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "Manifest file is missing: $($Matches[2])" }
        $fileHash = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($fileHash -ne $Matches[1]) { throw "Internal checksum mismatch: $($Matches[2])" }
    }
    Write-Host 'All internal file checksums: PASS'
}

Write-Host 'Recovery package verification completed successfully.'

