[CmdletBinding()]
param(
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
    [string]$OutputRoot = 'C:\Users\yuanb\CJC-Recovery-Staging'
)

. (Join-Path $PSScriptRoot 'Common.ps1')

$blocked = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -in @('Code.exe','codex.exe') -or
    ($_.Name -eq 'node.exe' -and $_.CommandLine -and $_.CommandLine.IndexOf([IO.Path]::GetFullPath($ProjectRoot), [StringComparison]::OrdinalIgnoreCase) -ge 0)
}
if ($blocked) {
    $summary = $blocked | ForEach-Object { "$($_.Name) PID $($_.ProcessId)" }
    throw "Close VS Code, Codex, and the project server before final capture. Still running: $($summary -join ', ')"
}

$sevenZip = 'C:\Program Files\7-Zip\7z.exe'
Assert-CommandPath -Path $sevenZip -Label '7-Zip'
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
& (Join-Path $PSScriptRoot 'New-RecoverySnapshot.ps1') -ProjectRoot $ProjectRoot -OutputRoot $OutputRoot -Timestamp $timestamp
if ($LASTEXITCODE -ne 0) { throw 'The base recovery snapshot did not complete.' }

$bundle = Join-Path ([IO.Path]::GetFullPath($OutputRoot)) "CJC-Recovery-$timestamp"
$context = Join-Path $bundle 'developer-context'
New-Item -ItemType Directory -Path $context | Out-Null

$contextSources = @(
    @{ Source = 'C:\Users\yuanb\.codex'; Destination = 'codex-home' },
    @{ Source = 'C:\Users\yuanb\.agents'; Destination = 'agent-skills' },
    @{ Source = 'C:\Users\yuanb\AppData\Roaming\Code\User'; Destination = 'vscode-user' },
    @{ Source = 'C:\Users\yuanb\.vscode\extensions'; Destination = 'vscode-extensions' }
)
foreach ($item in $contextSources) {
    if (-not (Test-Path -LiteralPath $item.Source -PathType Container)) { throw "Required developer context is missing: $($item.Source)" }
    Copy-DirectoryExact -Source $item.Source -Destination (Join-Path $context $item.Destination)
}

$sessionRoot = Join-Path $context 'codex-home\sessions'
$transcriptRoot = Join-Path $context 'readable-transcripts'
& node (Join-Path $PSScriptRoot 'Export-CodexTranscripts.mjs') $sessionRoot $transcriptRoot
if ($LASTEXITCODE -ne 0) { throw 'Readable Codex transcript export failed.' }

$extensionNames = Get-ChildItem -LiteralPath 'C:\Users\yuanb\.vscode\extensions' -Directory -Force | Sort-Object Name | Select-Object -ExpandProperty Name
[IO.File]::WriteAllLines((Join-Path $bundle 'verification\vscode-extension-folders.txt'), $extensionNames, [Text.UTF8Encoding]::new($false))

$securityNotice = @'
CONFIDENTIAL DEVELOPER CONTEXT

This folder can contain authentication tokens, local application state, chat content, attachments, and personal editor state.
It belongs only inside the encrypted recovery archive.

After reformatting, do not copy auth.json, cap_sid, or .sandbox-secrets into a new Codex installation. Sign in again. Restore sessions, transcripts, memories, skills, and reviewed configuration only when compatible with the installed version.
'@
[IO.File]::WriteAllText((Join-Path $context 'SECURITY-NOTICE.txt'), $securityNotice, [Text.UTF8Encoding]::new($false))

Write-Sha256Manifest -Root $bundle -OutputPath (Join-Path $bundle 'verification\SHA256SUMS.txt')
$finalInventory = Get-ChildItem -LiteralPath $bundle -File -Recurse -Force | Measure-Object -Property Length -Sum
$inventory = "Files: $($finalInventory.Count)`r`nBytes: $($finalInventory.Sum)`r`nCaptured: $(Get-Date -Format o)`r`n"
[IO.File]::WriteAllText((Join-Path $bundle 'verification\final-inventory.txt'), $inventory, [Text.UTF8Encoding]::new($false))
Write-Sha256Manifest -Root $bundle -OutputPath (Join-Path $bundle 'verification\SHA256SUMS.txt')

$archive = Join-Path $OutputRoot "CJC-Recovery-$timestamp.7z"
if (Test-Path -LiteralPath $archive) { throw "Archive already exists: $archive" }
Write-Host '7-Zip will now ask for the encryption password. Use a strong password stored in an off-device password manager.'
Push-Location $OutputRoot
try {
    & $sevenZip a -t7z $archive (Split-Path -Leaf $bundle) -mx=5 -mhe=on -p
    if ($LASTEXITCODE -ne 0) { throw 'Encrypted archive creation failed.' }
} finally { Pop-Location }
if (-not (Test-Path -LiteralPath $archive) -or (Get-Item -LiteralPath $archive).Length -le 0) { throw 'Encrypted archive is missing or empty.' }

$hash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
$sidecar = "$hash  $([IO.Path]::GetFileName($archive))`r`n"
[IO.File]::WriteAllText($archive + '.sha256', $sidecar, [Text.UTF8Encoding]::new($false))

Write-Host "Final encrypted archive: $archive"
Write-Host "Checksum: $archive.sha256"
Write-Host 'The unencrypted staging directory remains on this computer. Keep it private until the downloaded Google Drive copy has been verified, then remove it before giving the computer to anyone else.'
Write-Host 'Upload the .7z and .sha256 to private Google Drive, download them to a different folder, then run Test-RecoveryPackage.ps1 on the downloaded copy.'
