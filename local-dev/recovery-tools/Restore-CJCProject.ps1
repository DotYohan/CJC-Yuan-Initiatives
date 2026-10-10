[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$ExtractedBundle,
    [Parameter(Mandatory)][string]$ProjectDestination,
    [switch]$RestoreDatabase,
    [string]$AdminHost = '127.0.0.1',
    [int]$AdminPort = 5432,
    [string]$AdminDatabase = 'postgres',
    [string]$AdminUser = 'postgres'
)

. (Join-Path $PSScriptRoot 'Common.ps1')
$ExtractedBundle = [IO.Path]::GetFullPath($ExtractedBundle)
if (-not (Test-Path -LiteralPath (Join-Path $ExtractedBundle 'START-HERE.md') -PathType Leaf)) { throw 'This is not a valid extracted CJC recovery bundle.' }
Assert-EmptyOrMissingDirectory -Path $ProjectDestination

$manifest = Join-Path $ExtractedBundle 'verification\SHA256SUMS.txt'
Assert-CommandPath -Path $manifest -Label 'Internal checksum manifest'
foreach ($line in Get-Content -LiteralPath $manifest) {
    if (-not $line.Trim()) { continue }
    if ($line -notmatch '^([0-9a-f]{64})\s{2}(.+)$') { throw "Invalid checksum manifest line: $line" }
    $file = Join-Path $ExtractedBundle ($Matches[2].Replace('/', '\'))
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "Recovery file is missing: $($Matches[2])" }
    if ((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() -ne $Matches[1]) { throw "Recovery file checksum mismatch: $($Matches[2])" }
}

if ($RestoreDatabase) {
    $postgresBin = 'C:\Program Files\PostgreSQL\18\bin'
    $psql = Join-Path $postgresBin 'psql.exe'
    $pgRestore = Join-Path $postgresBin 'pg_restore.exe'
    Assert-CommandPath -Path $psql -Label 'psql'
    Assert-CommandPath -Path $pgRestore -Label 'pg_restore'
    $projectEnv = Join-Path $ExtractedBundle 'project\.env'
    $application = Get-PostgresConnection -EnvironmentPath $projectEnv
    Test-SafeDatabaseIdentity -Connection $application

    $securePassword = Read-Host "Password for PostgreSQL administrator $AdminUser" -AsSecureString
    $adminPassword = [Net.NetworkCredential]::new('', $securePassword).Password
    $admin = [pscustomobject]@{ Host=$AdminHost; Port=$AdminPort; Database=$AdminDatabase; User=$AdminUser; Password=$adminPassword }
    try {
        Invoke-WithPostgresEnvironment -Connection $admin -Action {
            $dbExists = (& $psql --no-password --no-psqlrc --tuples-only --no-align --set ON_ERROR_STOP=1 --command "SELECT 1 FROM pg_database WHERE datname='cor_jesu_sms';").Trim()
            if ($LASTEXITCODE -ne 0) { throw 'Could not connect with the provided PostgreSQL administrator credentials.' }
            if ($dbExists -eq '1') { throw 'Refusing restore: database cor_jesu_sms already exists.' }
            $roleExists = (& $psql --no-password --no-psqlrc --tuples-only --no-align --set ON_ERROR_STOP=1 --command "SELECT 1 FROM pg_roles WHERE rolname='cjc_app';").Trim()
            if ($LASTEXITCODE -ne 0) { throw 'Could not check PostgreSQL roles.' }
            if ($roleExists -eq '1') { throw 'Refusing restore: role cjc_app already exists. Review it manually before continuing.' }
            $escapedPassword = $application.Password.Replace("'", "''")
            "CREATE ROLE cjc_app LOGIN CREATEDB NOSUPERUSER NOCREATEROLE NOREPLICATION INHERIT NOBYPASSRLS PASSWORD '$escapedPassword';" | & $psql --no-password --no-psqlrc --set ON_ERROR_STOP=1
            if ($LASTEXITCODE -ne 0) { throw 'Could not recreate application role.' }
            "CREATE DATABASE cor_jesu_sms OWNER cjc_app TEMPLATE template0;" | & $psql --no-password --no-psqlrc --set ON_ERROR_STOP=1
            if ($LASTEXITCODE -ne 0) { throw 'Could not create empty application database.' }
        }
        $restoreAdmin = [pscustomobject]@{ Host=$AdminHost; Port=$AdminPort; Database='cor_jesu_sms'; User=$AdminUser; Password=$adminPassword }
        Invoke-WithPostgresEnvironment -Connection $restoreAdmin -Action {
            & $pgRestore --no-password --exit-on-error --single-transaction --dbname=cor_jesu_sms (Join-Path $ExtractedBundle 'database\cor_jesu_sms-current.dump')
            if ($LASTEXITCODE -ne 0) { throw 'Database restore failed. Do not run seeds or migrations.' }
        }
    } finally {
        $adminPassword = $null
        $securePassword.Dispose()
    }
}

Copy-DirectoryExact -Source (Join-Path $ExtractedBundle 'project') -Destination $ProjectDestination
Write-Host "Project restored to: $ProjectDestination"
Write-Host 'Next: run npm ci and npx prisma generate. Do not seed, reset, or automatically migrate.'
Write-Host 'Restore reviewed Codex/VS Code context selectively and sign in again; do not restore archived authentication tokens.'
