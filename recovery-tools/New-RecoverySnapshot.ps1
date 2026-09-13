[CmdletBinding()]
param(
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
    [string]$OutputRoot = 'C:\Users\yuanb\CJC-Recovery-Staging',
    [string]$Timestamp = (Get-Date -Format 'yyyyMMdd-HHmmss')
)

. (Join-Path $PSScriptRoot 'Common.ps1')

$ProjectRoot = [IO.Path]::GetFullPath($ProjectRoot).TrimEnd('\')
$OutputRoot = [IO.Path]::GetFullPath($OutputRoot).TrimEnd('\')
if ($OutputRoot.StartsWith($ProjectRoot + '\', [StringComparison]::OrdinalIgnoreCase)) {
    throw 'The recovery staging root must be outside the project to prevent recursive backup inclusion.'
}

$bundle = Join-Path $OutputRoot "CJC-Recovery-$Timestamp"
Assert-EmptyOrMissingDirectory -Path $bundle

$postgresBin = 'C:\Program Files\PostgreSQL\18\bin'
$pgDump = Join-Path $postgresBin 'pg_dump.exe'
$psql = Join-Path $postgresBin 'psql.exe'
Assert-CommandPath -Path $pgDump -Label 'pg_dump'
Assert-CommandPath -Path $psql -Label 'psql'
Assert-CommandPath -Path (Join-Path $ProjectRoot '.env') -Label 'Project .env'
Assert-CommandPath -Path (Join-Path $ProjectRoot 'prisma\schema.prisma') -Label 'Prisma schema'

$runningPortal = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
    Where-Object { $_.CommandLine -and $_.CommandLine.IndexOf($ProjectRoot, [StringComparison]::OrdinalIgnoreCase) -ge 0 -and $_.CommandLine -match 'server[\\/]server\.mjs' }
if ($runningPortal) {
    throw "The project portal is still running (PID $($runningPortal.ProcessId -join ', ')). Stop it before creating a consistent snapshot."
}

$connection = Get-PostgresConnection -EnvironmentPath (Join-Path $ProjectRoot '.env')
Test-SafeDatabaseIdentity -Connection $connection

New-Item -ItemType Directory -Path $bundle | Out-Null
foreach ($folder in @('database','reference-files','verification')) {
    New-Item -ItemType Directory -Path (Join-Path $bundle $folder) | Out-Null
}

$databaseDir = Join-Path $bundle 'database'
$verifyDir = Join-Path $bundle 'verification'
$dumpPath = Join-Path $databaseDir 'cor_jesu_sms-current.dump'
$schemaPath = Join-Path $databaseDir 'cor_jesu_sms-schema-only.sql'
$dumpLog = Join-Path $verifyDir 'pg-dump.log'

Invoke-WithPostgresEnvironment -Connection $connection -Action {
    $identity = & $psql --no-password --no-psqlrc --tuples-only --no-align --set ON_ERROR_STOP=1 --command "SELECT current_user || '|' || current_database() || '|' || inet_server_addr() || '|' || current_setting('server_version');"
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL identity check failed. No backup was produced.' }
    $identityLine = ($identity | Select-Object -First 1).Trim()
    $expectedPrefix = "$($connection.User)|$($connection.Database)|"
    if (-not $identityLine.StartsWith($expectedPrefix, [StringComparison]::Ordinal)) {
        throw "PostgreSQL returned an unexpected identity: $identityLine"
    }
    [IO.File]::WriteAllText((Join-Path $verifyDir 'database-identity.txt'), $identityLine + [Environment]::NewLine, [Text.UTF8Encoding]::new($false))

    $previousErrorAction = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & $pgDump --no-password --format=custom --file=$dumpPath --verbose 2> $dumpLog
        $dumpExitCode = $LASTEXITCODE
    } finally { $ErrorActionPreference = $previousErrorAction }
    if ($dumpExitCode -ne 0) { throw "pg_dump custom-format export failed. Review $dumpLog" }
    if (-not (Test-Path -LiteralPath $dumpPath) -or (Get-Item -LiteralPath $dumpPath).Length -le 0) { throw 'The fresh PostgreSQL dump is missing or empty.' }

    & $pgDump --no-password --schema-only --file=$schemaPath
    if ($LASTEXITCODE -ne 0) { throw 'pg_dump schema-only export failed.' }

    $tables = & $psql --no-password --no-psqlrc --tuples-only --no-align --set ON_ERROR_STOP=1 --command "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;"
    if ($LASTEXITCODE -ne 0) { throw 'Could not enumerate PostgreSQL tables.' }
    $countRows = [Collections.Generic.List[string]]::new()
    $countRows.Add('table,row_count')
    foreach ($table in $tables) {
        $name = $table.Trim()
        if (-not $name) { continue }
        $quoted = '"' + $name.Replace('"','""') + '"'
        $count = (& $psql --no-password --no-psqlrc --tuples-only --no-align --set ON_ERROR_STOP=1 --command "SELECT count(*) FROM public.$quoted;").Trim()
        if ($LASTEXITCODE -ne 0) { throw "Could not count table: $name" }
        $countRows.Add('"' + $name.Replace('"','""') + '",' + $count)
    }
    [IO.File]::WriteAllLines((Join-Path $verifyDir 'table-counts.csv'), $countRows, [Text.UTF8Encoding]::new($false))

    $roleAttributes = & $psql --no-password --no-psqlrc --tuples-only --no-align --field-separator='|' --set ON_ERROR_STOP=1 --command "SELECT rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb, rolcanlogin, rolreplication, rolbypassrls, rolconnlimit FROM pg_roles WHERE rolname=current_user;"
    if ($LASTEXITCODE -ne 0 -or -not $roleAttributes) { throw 'Could not capture application-role attributes.' }
    [IO.File]::WriteAllText((Join-Path $databaseDir 'application-role-attributes.txt'), ($roleAttributes -join [Environment]::NewLine) + [Environment]::NewLine, [Text.UTF8Encoding]::new($false))

    $metadataQueries = @{
        'database-grants.csv' = "SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE grantee=current_user GROUP BY grantee, privilege_type ORDER BY privilege_type;"
        'table-grants.csv' = "SELECT table_schema, table_name, privilege_type FROM information_schema.role_table_grants WHERE grantee=current_user ORDER BY table_schema, table_name, privilege_type;"
        'sequence-grants.csv' = "SELECT object_schema, object_name, privilege_type FROM information_schema.role_usage_grants WHERE grantee=current_user ORDER BY object_schema, object_name, privilege_type;"
        'role-memberships.csv' = "SELECT member.rolname AS member, parent.rolname AS granted_role FROM pg_auth_members m JOIN pg_roles member ON member.oid=m.member JOIN pg_roles parent ON parent.oid=m.roleid WHERE member.rolname=current_user OR parent.rolname=current_user ORDER BY 1,2;"
        'constraints.csv' = "SELECT n.nspname AS schema_name, c.relname AS table_name, con.conname, con.contype FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname, con.conname;"
        'triggers.csv' = "SELECT event_object_table, trigger_name, event_manipulation, action_timing FROM information_schema.triggers WHERE trigger_schema='public' ORDER BY event_object_table, trigger_name, event_manipulation;"
        'indexes.csv' = "SELECT tablename, indexname FROM pg_indexes WHERE schemaname='public' ORDER BY tablename, indexname;"
    }
    foreach ($entry in $metadataQueries.GetEnumerator()) {
        $target = Join-Path $verifyDir $entry.Key
        & $psql --no-password --no-psqlrc --csv --set ON_ERROR_STOP=1 --command $entry.Value | Set-Content -LiteralPath $target -Encoding utf8
        if ($LASTEXITCODE -ne 0) { throw "Could not capture $($entry.Key)." }
    }
}

$versionLines = [Collections.Generic.List[string]]::new()
$versionLines.Add("Captured: $(Get-Date -Format o)")
$versionLines.Add("Windows: $([Environment]::OSVersion.VersionString)")
$versionLines.Add("PowerShell: $($PSVersionTable.PSVersion)")
$versionLines.Add("Node: $(& node --version)")
$versionLines.Add("npm: $(& npm.cmd --version)")
$versionLines.Add("Git: $(& git --version)")
$versionLines.Add("PostgreSQL tools: $(& $pgDump --version)")
$sevenZip = 'C:\Program Files\7-Zip\7z.exe'
if (Test-Path -LiteralPath $sevenZip -PathType Leaf) {
    $versionLines.Add("7-Zip: $((& $sevenZip | Select-Object -First 2) -join ' ')")
} else { $versionLines.Add('7-Zip: not installed; required before final encrypted capture') }
try { $versionLines.Add("VS Code: $((& code --version | Select-Object -First 1))") } catch { $versionLines.Add('VS Code: unable to query') }
try { $versionLines.Add("Codex: $(& codex --version)") } catch { $versionLines.Add('Codex: unable to query') }
$prismaPackage = Join-Path $ProjectRoot 'node_modules\prisma\package.json'
if (Test-Path -LiteralPath $prismaPackage) {
    $versionLines.Add("Prisma: $((Get-Content -LiteralPath $prismaPackage -Raw | ConvertFrom-Json).version)")
} else { $versionLines.Add('Prisma: package not installed') }
[IO.File]::WriteAllLines((Join-Path $verifyDir 'tool-versions.txt'), $versionLines, [Text.UTF8Encoding]::new($false))

$oldDatabaseUrl = $env:DATABASE_URL
try {
    $env:DATABASE_URL = $connection.Raw
    $previousErrorAction = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & npx.cmd prisma validate *> (Join-Path $verifyDir 'prisma-validate.log')
        $validateExit = $LASTEXITCODE
        & npx.cmd prisma migrate status *> (Join-Path $verifyDir 'prisma-migrate-status.log')
        $statusExit = $LASTEXITCODE
    } finally { $ErrorActionPreference = $previousErrorAction }
    if ($validateExit -ne 0) { throw 'Prisma validation failed; see verification/prisma-validate.log.' }
    if ($statusExit -ne 0) { throw 'Prisma migration status failed; see verification/prisma-migrate-status.log.' }
} finally {
    $env:DATABASE_URL = $oldDatabaseUrl
}

$referenceFiles = @(
    'C:\Users\yuanb\Downloads\509446121_734706376080558_790424036309026510_n.jpg',
    'C:\Users\yuanb\Downloads\582419448_1552741215726168_531359223782787827_n.jpg',
    'C:\Users\yuanb\Downloads\ChatGPT Image Aug 25, 2026, 10_30_43 PM.png'
)
foreach ($source in $referenceFiles) {
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Required external reference file is missing: $source" }
    Copy-Item -LiteralPath $source -Destination (Join-Path $bundle 'reference-files')
}

$longPathBackup = Join-Path $ProjectRoot 'backups\checkpoint-before-enrollment-period-management-20260831-003429'
$projectDestination = Join-Path $bundle 'project'
if (Test-Path -LiteralPath $longPathBackup -PathType Container) {
    Copy-DirectoryExact -Source $ProjectRoot -Destination $projectDestination -ExcludeDirectories @($longPathBackup)
    $preservedArchive = Join-Path $projectDestination 'backups\checkpoint-before-enrollment-period-management-20260831-003429-LONG-PATH-COMPLETE.7z'
    $sevenZipForLongPaths = 'C:\Program Files\7-Zip\7z.exe'
    Assert-CommandPath -Path $sevenZipForLongPaths -Label '7-Zip for long-path backup preservation'
    $previousErrorAction = $ErrorActionPreference
    Push-Location (Split-Path -Parent $longPathBackup)
    try {
        $ErrorActionPreference = 'Continue'
        & $sevenZipForLongPaths a -t7z $preservedArchive (Split-Path -Leaf $longPathBackup) -mx=3 *> (Join-Path $verifyDir 'long-path-backup-archive.log')
        $longPathArchiveExit = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorAction
        Pop-Location
    }
    if ($longPathArchiveExit -ne 0 -or -not (Test-Path -LiteralPath $preservedArchive) -or (Get-Item -LiteralPath $preservedArchive).Length -le 0) {
        throw 'Could not preserve the recursively nested historical backup as a long-path archive.'
    }
    $longPathNote = @"
The original historical checkpoint at:
$longPathBackup

contains a real, recursively nested copy of its own backups directory. Normal Windows copy operations fail with ERROR 206 because the resulting paths exceed Win32 limits. Every readable file from that checkpoint is preserved in:

project/backups/$(Split-Path -Leaf $preservedArchive)

Keep the inner archive as historical evidence. Extracting it is not required to run the portal and may recreate unusably long paths.
"@
    [IO.File]::WriteAllText((Join-Path $verifyDir 'long-path-backup-note.txt'), $longPathNote, [Text.UTF8Encoding]::new($false))
} else {
    Copy-DirectoryExact -Source $ProjectRoot -Destination $projectDestination
}
Copy-DirectoryExact -Source $PSScriptRoot -Destination (Join-Path $bundle 'recovery-tools')

$startHere = @"
# CJC Recovery Package

Captured: $(Get-Date -Format o)

Start with `project/docs/RECOVERY-HANDOFF.md`. The authoritative database backup is `database/cor_jesu_sms-current.dump`.

This directory contains confidential student, authentication, database, editor, and developer-context data. Keep it encrypted and private. Do not publish it to GitHub.

Before restoring, verify `verification/SHA256SUMS.txt`. Never run Prisma reset or seed commands during recovery.
"@
[IO.File]::WriteAllText((Join-Path $bundle 'START-HERE.md'), $startHere, [Text.UTF8Encoding]::new($false))

$inventory = Get-ChildItem -LiteralPath $bundle -File -Recurse -Force | Measure-Object -Property Length -Sum
$inventoryText = "Files before context capture: $($inventory.Count)`r`nBytes before context capture: $($inventory.Sum)`r`nBundle: $bundle`r`n"
[IO.File]::WriteAllText((Join-Path $verifyDir 'snapshot-inventory.txt'), $inventoryText, [Text.UTF8Encoding]::new($false))
Write-Sha256Manifest -Root $bundle -OutputPath (Join-Path $verifyDir 'SHA256SUMS.txt')

Write-Host "Recovery snapshot created: $bundle"
Write-Host 'This is not yet the final archive. Run Finalize-RecoveryPackage.ps1 only after closing VS Code and Codex.'
