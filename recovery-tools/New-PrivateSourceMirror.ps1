[CmdletBinding()]
param(
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
    [string]$Destination = 'C:\Users\yuanb\CJC-Student-Portal-GitHub',
    [string]$PrivateRemoteUrl = '',
    [string]$CommitName = 'CJC Recovery Backup',
    [string]$CommitEmail = 'cjc-recovery@local.invalid'
)

. (Join-Path $PSScriptRoot 'Common.ps1')
Assert-EmptyOrMissingDirectory -Path $Destination
New-Item -ItemType Directory -Path $Destination | Out-Null

$includedDirectories = @('assets','docs','prisma','scripts','server','tests','.vscode','recovery-tools')
foreach ($directory in $includedDirectories) {
    $source = Join-Path $ProjectRoot $directory
    if (Test-Path -LiteralPath $source -PathType Container) {
        Copy-DirectoryExact -Source $source -Destination (Join-Path $Destination $directory)
    }
}

$includedFiles = @(
    '.env.example','.gitignore','README.md','PROGRAM_HEAD_FIX_GUIDE.md','package.json','package-lock.json','prisma.config.ts','codeswing.json',
    'auth-client.js','index.html','portal.html','reset-password.html','signup.html','script.js','portal.js','reset-password.js','signup.js','style.css','portal.css','reset-password.css','signup.css'
)
foreach ($file in $includedFiles) {
    $source = Join-Path $ProjectRoot $file
    if (Test-Path -LiteralPath $source -PathType Leaf) { Copy-Item -LiteralPath $source -Destination (Join-Path $Destination $file) }
}

# These legacy convenience scripts contain known demo passwords. They remain in
# the encrypted full recovery package but must never enter Git history.
$gitExcludedFiles = @(
    'prisma\seeds\scripts\create-registrar-demo.mjs',
    'prisma\seeds\scripts\create-role-demos.mjs',
    'prisma\seeds\scripts\create-student-demo.mjs'
)
foreach ($relativeFile in $gitExcludedFiles) {
    $candidate = [IO.Path]::GetFullPath((Join-Path $Destination $relativeFile))
    $destinationBoundary = [IO.Path]::GetFullPath($Destination).TrimEnd('\') + '\'
    if (-not $candidate.StartsWith($destinationBoundary, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe Git exclusion path.' }
    if (Test-Path -LiteralPath $candidate -PathType Leaf) { Remove-Item -LiteralPath $candidate -Force }
}

$forbiddenNames = @('.env','auth.json','cap_sid')
$forbiddenExtensions = @('.dump','.sqlite','.sqlite-wal','.sqlite-shm','.7z','.zip','.bak')
$destinationFull = [IO.Path]::GetFullPath($Destination).TrimEnd('\')
$violations = Get-ChildItem -LiteralPath $Destination -File -Recurse -Force | Where-Object {
    $relative = $_.FullName.Substring($destinationFull.Length + 1)
    $topDirectory = ($relative -split '[\\/]', 2)[0]
    $_.Name -in $forbiddenNames -or $_.Extension -in $forbiddenExtensions -or $topDirectory -in @('backups','data','developer-context')
}
if ($violations) { throw "Forbidden confidential/backup files entered the Git mirror: $($violations.FullName -join ', ')" }

$secretPatterns = '(?i)(postgres(?:ql)?://[^\s"'']+:[^\s"'']+@|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|CJC_AUDIT_PEPPER\s*=\s*[^\s]+|PGPASSWORD\s*=\s*[^\s]+)'
$secretHits = Get-ChildItem -LiteralPath $Destination -File -Recurse -Force |
    Where-Object Name -ne '.env.example' |
    Select-String -Pattern $secretPatterns -ErrorAction SilentlyContinue |
    Where-Object { $_.Line -notmatch '(username:password|replace-me|replace-with-a-long-random-production-secret|\$databasePassword)' }
if ($secretHits) {
    $locations = $secretHits | ForEach-Object { "$($_.Path):$($_.LineNumber)" }
    throw "Potential secrets found. Review before any push: $($locations -join ', ')"
}

Push-Location $Destination
try {
    & git init --initial-branch=main
    if ($LASTEXITCODE -ne 0) { throw 'git init failed.' }
    & git add --all
    if ($LASTEXITCODE -ne 0) { throw 'git add failed.' }
    & git config user.name $CommitName
    & git config user.email $CommitEmail
    & git commit -m 'Backup current CJC Student Portal source'
    if ($LASTEXITCODE -ne 0) { throw 'git commit failed. Configure git user.name and user.email, then retry.' }
    if ($PrivateRemoteUrl) {
        if ($PrivateRemoteUrl -notmatch '^https://github\.com/[^/]+/[^/]+(?:\.git)?$') { throw 'PrivateRemoteUrl must be an HTTPS GitHub repository URL.' }
        & git remote add origin $PrivateRemoteUrl
        if ($LASTEXITCODE -ne 0) { throw 'Could not add the GitHub remote.' }
        Write-Host 'Remote added. Confirm the GitHub repository is PRIVATE before running: git push -u origin main'
    }
} finally { Pop-Location }

Write-Host "Reviewed local source mirror created: $Destination"
Write-Host 'It excludes .env, runtime data, database dumps, chats, dependencies, and all backup archives.'
