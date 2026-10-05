[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$BundlePath,
    [string]$ScratchRoot = 'C:\Users\yuanb\CJC-Recovery-Restore-Tests'
)

. (Join-Path $PSScriptRoot 'Common.ps1')
$BundlePath = [IO.Path]::GetFullPath($BundlePath).TrimEnd('\')
if (-not (Test-Path -LiteralPath (Join-Path $BundlePath 'START-HERE.md') -PathType Leaf)) { throw 'Invalid recovery bundle.' }
$dump = Join-Path $BundlePath 'database\cor_jesu_sms-current.dump'
$baseline = Join-Path $BundlePath 'verification\table-counts.csv'
Assert-CommandPath -Path $dump -Label 'Fresh PostgreSQL dump'
Assert-CommandPath -Path $baseline -Label 'Table-count baseline'

$postgresBin = 'C:\Program Files\PostgreSQL\18\bin'
$initdb = Join-Path $postgresBin 'initdb.exe'
$pgCtl = Join-Path $postgresBin 'pg_ctl.exe'
$pgIsReady = Join-Path $postgresBin 'pg_isready.exe'
$psql = Join-Path $postgresBin 'psql.exe'
$pgRestore = Join-Path $postgresBin 'pg_restore.exe'
foreach ($tool in @($initdb,$pgCtl,$pgIsReady,$psql,$pgRestore)) { Assert-CommandPath -Path $tool -Label ([IO.Path]::GetFileName($tool)) }

$scratch = Join-Path ([IO.Path]::GetFullPath($ScratchRoot).TrimEnd('\')) (Get-Date -Format 'yyyyMMdd-HHmmss')
Assert-EmptyOrMissingDirectory -Path $scratch
New-Item -ItemType Directory -Path $scratch | Out-Null
$dataDir = Join-Path $scratch 'postgres-data'
$passwordFile = Join-Path $scratch 'admin-password.txt'
$serverLog = Join-Path $scratch 'postgres.log'
$resultPath = Join-Path $BundlePath 'verification\isolated-restore-test.txt'

$random = [byte[]]::new(32)
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($random)
$adminPassword = [Convert]::ToBase64String($random)
[IO.File]::WriteAllText($passwordFile, $adminPassword, [Text.UTF8Encoding]::new($false))

$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
$listener.Start()
$port = ([Net.IPEndPoint]$listener.LocalEndpoint).Port
$listener.Stop()
$started = $false
$testPassed = $false
$details = [Collections.Generic.List[string]]::new()

try {
    $oldAction = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & $initdb --pgdata=$dataDir --username=postgres --auth-host=scram-sha-256 --auth-local=trust --pwfile=$passwordFile --encoding=UTF8 *> (Join-Path $scratch 'initdb.log')
        $initExit = $LASTEXITCODE
    } finally { $ErrorActionPreference = $oldAction }
    if ($initExit -ne 0) { throw 'initdb failed; review the isolated test log.' }
    Remove-Item -LiteralPath $passwordFile -Force

    $startStdout = Join-Path $scratch 'pg-ctl-start.stdout.log'
    $startStderr = Join-Path $scratch 'pg-ctl-start.stderr.log'
    $startArguments = @('start','-D',"`"$dataDir`"",'-l',"`"$serverLog`"",'-o',"`"-h 127.0.0.1 -p $port`"",'-w','-t','30')
    $startProcess = Start-Process -FilePath $pgCtl -ArgumentList $startArguments -WindowStyle Hidden -PassThru -RedirectStandardOutput $startStdout -RedirectStandardError $startStderr
    $startProcess.WaitForExit()
    $startProcess.Refresh()
    $startExit = $startProcess.ExitCode
    $oldAction = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & $pgIsReady --host=127.0.0.1 --port=$port --dbname=postgres --timeout=5 --quiet
        $readyExit = $LASTEXITCODE
    } finally { $ErrorActionPreference = $oldAction }
    if ($readyExit -ne 0) { throw "The isolated PostgreSQL server failed readiness (pg_ctl exit $startExit)." }
    $started = $true

    $admin = [pscustomobject]@{ Host='127.0.0.1'; Port=$port; Database='postgres'; User='postgres'; Password=$adminPassword }
    $applicationSource = Get-PostgresConnection -EnvironmentPath (Join-Path $BundlePath 'project\.env')
    Test-SafeDatabaseIdentity -Connection $applicationSource
    $application = [pscustomobject]@{ Host='127.0.0.1'; Port=$port; Database='cor_jesu_sms'; User='cjc_app'; Password=$applicationSource.Password }

    Invoke-WithPostgresEnvironment -Connection $admin -Action {
        $escapedPassword = $application.Password.Replace("'", "''")
        "CREATE ROLE cjc_app LOGIN CREATEDB NOSUPERUSER NOCREATEROLE NOREPLICATION INHERIT NOBYPASSRLS PASSWORD '$escapedPassword';" | & $psql --no-password --no-psqlrc --set ON_ERROR_STOP=1
        if ($LASTEXITCODE -ne 0) { throw 'Could not create the isolated cjc_app role.' }
        'CREATE DATABASE cor_jesu_sms OWNER cjc_app TEMPLATE template0;' | & $psql --no-password --no-psqlrc --set ON_ERROR_STOP=1
        if ($LASTEXITCODE -ne 0) { throw 'Could not create the isolated database.' }
    }

    $restoreAdmin = [pscustomobject]@{ Host='127.0.0.1'; Port=$port; Database='cor_jesu_sms'; User='postgres'; Password=$adminPassword }
    $oldAction = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        Invoke-WithPostgresEnvironment -Connection $restoreAdmin -Action {
            & $pgRestore --no-password --exit-on-error --single-transaction --dbname=cor_jesu_sms $dump *> (Join-Path $scratch 'pg-restore.log')
            $script:restoreExit = $LASTEXITCODE
        }
    } finally { $ErrorActionPreference = $oldAction }
    if ($restoreExit -ne 0) { throw 'pg_restore failed in the isolated cluster.' }

    $expected = Import-Csv -LiteralPath $baseline
    $actualCounts = @{}
    Invoke-WithPostgresEnvironment -Connection $application -Action {
        foreach ($row in $expected) {
            $quoted = '"' + $row.table.Replace('"','""') + '"'
            $count = (& $psql --no-password --no-psqlrc --tuples-only --no-align --set ON_ERROR_STOP=1 --command "SELECT count(*) FROM public.$quoted;").Trim()
            if ($LASTEXITCODE -ne 0) { throw "Could not count restored table $($row.table)." }
            $actualCounts[$row.table] = [long]$count
        }
        $identity = (& $psql --no-password --no-psqlrc --tuples-only --no-align --set ON_ERROR_STOP=1 --command "SELECT current_user || '|' || current_database();").Trim()
        $details.Add("Restored identity: $identity")
    }

    $mismatches = foreach ($row in $expected) {
        if ([long]$row.row_count -ne $actualCounts[$row.table]) {
            "$($row.table): expected $($row.row_count), restored $($actualCounts[$row.table])"
        }
    }
    if ($mismatches) { throw "Restored table-count mismatches: $($mismatches -join '; ')" }
    $details.Add("Public tables compared: $($expected.Count)")
    $details.Add('All table row counts match: YES')
    $details.Add("Dump bytes: $((Get-Item -LiteralPath $dump).Length)")
    $details.Add("Completed: $(Get-Date -Format o)")
    $testPassed = $true
} finally {
    if ($started) {
        $stopStdout = Join-Path $scratch 'pg-ctl-stop.stdout.log'
        $stopStderr = Join-Path $scratch 'pg-ctl-stop.stderr.log'
        $stopArguments = @('stop','-D',"`"$dataDir`"",'-m','fast','-w','-t','30')
        $stopProcess = Start-Process -FilePath $pgCtl -ArgumentList $stopArguments -WindowStyle Hidden -PassThru -RedirectStandardOutput $stopStdout -RedirectStandardError $stopStderr
        $stopProcess.WaitForExit()
        $stopProcess.Refresh()
        $oldAction = $ErrorActionPreference
        try {
            $ErrorActionPreference = 'Continue'
            & $pgIsReady --host=127.0.0.1 --port=$port --dbname=postgres --timeout=2 --quiet
            $stillReady = $LASTEXITCODE -eq 0
        } finally { $ErrorActionPreference = $oldAction }
        if ($stillReady) { Write-Warning "Could not stop isolated PostgreSQL cleanly; scratch retained at $scratch"; $testPassed = $false }
    }
    if ($testPassed) {
        $safeRoot = [IO.Path]::GetFullPath($ScratchRoot).TrimEnd('\')
        $safeScratch = [IO.Path]::GetFullPath($scratch)
        if (-not $safeScratch.StartsWith($safeRoot + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Refusing to remove an unsafe scratch path.' }
        [IO.File]::WriteAllLines($resultPath, @('ISOLATED DATABASE RESTORE: PASS') + $details, [Text.UTF8Encoding]::new($false))
        Remove-Item -LiteralPath $safeScratch -Recurse -Force
    } else {
        Write-Warning "Restore test failed. Diagnostic scratch data was retained at: $scratch"
    }
}

Write-Host "Isolated database restore test: PASS. Report: $resultPath"
