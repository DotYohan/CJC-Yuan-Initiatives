Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Assert-CommandPath {
    param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)][string]$Label)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "$Label was not found at: $Path"
    }
}

function Assert-EmptyOrMissingDirectory {
    param([Parameter(Mandatory)][string]$Path)
    if (Test-Path -LiteralPath $Path) {
        $resolved = (Resolve-Path -LiteralPath $Path).Path
        if ((Get-ChildItem -LiteralPath $resolved -Force | Select-Object -First 1)) {
            throw "Refusing to use non-empty target directory: $resolved"
        }
    }
}

function Get-DotEnvValues {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Required .env file is missing: $Path"
    }
    $values = @{}
    foreach ($line in Get-Content -LiteralPath $Path) {
        if ($line -match '^\s*#' -or [string]::IsNullOrWhiteSpace($line)) { continue }
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
            $value = $Matches[2]
            if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            $values[$Matches[1]] = $value
        }
    }
    return $values
}

function Get-PostgresConnection {
    param([Parameter(Mandatory)][string]$EnvironmentPath)
    $values = Get-DotEnvValues -Path $EnvironmentPath
    if (-not $values.ContainsKey('DATABASE_URL')) { throw 'DATABASE_URL is missing from .env.' }
    try { $uri = [Uri]$values.DATABASE_URL } catch { throw 'DATABASE_URL is not a valid PostgreSQL URL.' }
    if ($uri.Scheme -notin @('postgresql', 'postgres')) { throw 'DATABASE_URL is not a PostgreSQL URL.' }
    $userInfo = $uri.UserInfo.Split(':', 2)
    if ($userInfo.Count -ne 2) { throw 'DATABASE_URL must contain a username and password.' }
    return [pscustomobject]@{
        Host = $uri.Host
        Port = if ($uri.Port -gt 0) { $uri.Port } else { 5432 }
        Database = [Uri]::UnescapeDataString($uri.AbsolutePath.TrimStart('/'))
        User = [Uri]::UnescapeDataString($userInfo[0])
        Password = [Uri]::UnescapeDataString($userInfo[1])
        Raw = $values.DATABASE_URL
    }
}

function Invoke-WithPostgresEnvironment {
    param(
        [Parameter(Mandatory)]$Connection,
        [Parameter(Mandatory)][scriptblock]$Action
    )
    $names = @('PGHOST','PGPORT','PGDATABASE','PGUSER','PGPASSWORD')
    $old = @{}
    foreach ($name in $names) { $old[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
    try {
        $env:PGHOST = $Connection.Host
        $env:PGPORT = [string]$Connection.Port
        $env:PGDATABASE = $Connection.Database
        $env:PGUSER = $Connection.User
        $env:PGPASSWORD = $Connection.Password
        & $Action
    } finally {
        foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name, $old[$name], 'Process') }
    }
}

function Copy-DirectoryExact {
    param(
        [Parameter(Mandatory)][string]$Source,
        [Parameter(Mandatory)][string]$Destination,
        [string[]]$ExcludeDirectories = @()
    )
    if (-not (Test-Path -LiteralPath $Source -PathType Container)) { throw "Required directory is missing: $Source" }
    if (Test-Path -LiteralPath $Destination) { throw "Copy destination already exists: $Destination" }
    New-Item -ItemType Directory -Path $Destination | Out-Null
    $arguments = @($Source, $Destination, '/E', '/COPY:DAT', '/DCOPY:DAT', '/XJ', '/R:1', '/W:1', '/NP', '/NFL', '/NDL')
    if ($ExcludeDirectories.Count -gt 0) { $arguments += '/XD'; $arguments += $ExcludeDirectories }
    & robocopy.exe @arguments | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "Robocopy failed with exit code $LASTEXITCODE while copying $Source" }
}

function Write-Sha256Manifest {
    param([Parameter(Mandatory)][string]$Root, [Parameter(Mandatory)][string]$OutputPath)
    $rootFull = [IO.Path]::GetFullPath($Root).TrimEnd('\')
    $outputFull = [IO.Path]::GetFullPath($OutputPath)
    $rows = Get-ChildItem -LiteralPath $rootFull -File -Recurse -Force |
        Where-Object { $_.FullName -ne $outputFull } |
        Sort-Object FullName |
        ForEach-Object {
            $relative = $_.FullName.Substring($rootFull.Length + 1).Replace('\','/')
            $hash = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
            "$hash  $relative"
        }
    [IO.File]::WriteAllLines($outputFull, $rows, [Text.UTF8Encoding]::new($false))
}

function Test-SafeDatabaseIdentity {
    param([Parameter(Mandatory)]$Connection)
    if ($Connection.User -ne 'cjc_app' -or $Connection.Database -ne 'cor_jesu_sms' -or $Connection.Host -notin @('127.0.0.1','localhost')) {
        throw "Unexpected database target. Expected cjc_app@127.0.0.1/cor_jesu_sms; got $($Connection.User)@$($Connection.Host)/$($Connection.Database)."
    }
}
