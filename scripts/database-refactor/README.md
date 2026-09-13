# Academic organization refactor execution package

Status: **executed successfully on 2026-09-01; do not replay**.

Tooling update (2026-09-01): PostgreSQL 18.6 `psql`, `pg_dump`, and `pg_restore`
were located at `C:\Program Files\PostgreSQL\18\bin` and match the server
version. The project checkpoint and custom-format database dump were created
and validated, the SELECT-only preflight passed, and the owner separately
approved the cutover. PostgreSQL completed the transaction with `COMMIT`.

The SQL files are deliberately separate from Prisma migrations because the data
cutover contains UUIDs from one live database and must never replay blindly in a
fresh or different environment.

## Files

1. `001-academic-organization-preflight.sql` — read-only source-state report.
2. `002-normalize-engineering-organization.sql` — one-transaction cutover with
   explicit UUIDs, exact row-count assertions, and abort-on-conflict behavior.
3. `003-academic-organization-verify.sql` — read-only post-cutover verification.

File 2 is a one-time live UUID cutover and has already been applied. Do not run
it again. Any future refactor requires a new audit, backup, and migration file.

## Exact reviewed impact

Provided every precondition still matches, file 2 performs:

- 4 updates: one canonical Department and three preserved Programs.
- 34 deletes: two empty legacy Departments plus 32 UUID-pinned fixture-only
  rows (four each from eight academic tables).
- 1 functional unique index for canonical Department code per College.
- 0 inserts, 0 table drops, 0 truncates, and 0 authentication/security writes.

Any changed UUID, unexpected dependency, or unexpected row count raises an
exception before commit and rolls back the entire transaction.

## Required backup and checkpoint

The workspace is not a Git repository. Immediately before execution, create a
filesystem checkpoint and a fresh PostgreSQL custom-format dump. The migration
operator must load the connection from `.env`, not from a stale process-level
`DATABASE_URL`.

Suggested backup filename:

```text
backups/cor_jesu_sms-before-academic-organization-refactor.dump
```

PowerShell backup procedure (review before use):

```powershell
$projectRoot = (Get-Location).Path
$backupDirectory = Join-Path $projectRoot 'backups'
New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null

$envLine = Get-Content -LiteralPath (Join-Path $projectRoot '.env') |
  Where-Object { $_ -match '^DATABASE_URL=' } |
  Select-Object -First 1
if (-not $envLine) { throw 'DATABASE_URL is missing from .env' }

$databaseUrl = ($envLine -replace '^DATABASE_URL=', '').Trim('"')
$uri = [Uri]$databaseUrl
$credentials = $uri.UserInfo.Split(':', 2)
$databaseUser = [Uri]::UnescapeDataString($credentials[0])
$databasePassword = [Uri]::UnescapeDataString($credentials[1])
$databaseName = $uri.AbsolutePath.TrimStart('/')

if ($databaseUser -ne 'cjc_app' -or $uri.Host -ne '127.0.0.1' -or $databaseName -ne 'cor_jesu_sms') {
  throw 'DATABASE_URL does not match the reviewed database identity'
}

$dumpPath = Join-Path $backupDirectory 'cor_jesu_sms-before-academic-organization-refactor.dump'
$env:PGPASSWORD = $databasePassword
try {
  pg_dump --host=$($uri.Host) --port=$($uri.Port) --username=$databaseUser `
    --dbname=$databaseName --format=custom --file=$dumpPath
  if ($LASTEXITCODE -ne 0) { throw "pg_dump failed with exit code $LASTEXITCODE" }
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

$dump = Get-Item -LiteralPath $dumpPath
if ($dump.Length -le 0) { throw 'Backup file is empty' }
pg_restore --list $dumpPath | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'pg_restore could not read the custom-format backup catalog' }
$dump | Select-Object FullName, Length, LastWriteTime
```

A timestamped filesystem copy must also be created before file or data changes
are activated. Exclude `node_modules` and `backups` to avoid recursion.

## Historical reviewed execution sequence (completed; do not rerun)

1. Stop application write traffic.
2. Recheck `DATABASE_URL`, `current_user`, and `current_database()`.
3. Create and verify the backup/checkpoint above.
4. Run the read-only preflight and compare all counts with the progress document.
5. Obtain final execution approval.
6. Run `002-normalize-engineering-organization.sql` with `psql` and
   `ON_ERROR_STOP=1`.
7. Run `003-academic-organization-verify.sql`.
8. Run Prisma validation/status/diff and application tests against an isolated
   test database.
9. Update `docs/database-refactor-progress.md` with the actual row counts,
   backup path, timestamps, and result.

The following is the command order that was reviewed and completed. It remains
for audit history only and must not be rerun:

```powershell
$env:PGPASSWORD = $databasePassword
try {
  psql --host=$($uri.Host) --port=$($uri.Port) --username=$databaseUser `
    --dbname=$databaseName --file='scripts/database-refactor/001-academic-organization-preflight.sql'
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
```

At execution time, the operator stopped here, compared the full preflight
output with the progress document, obtained separate final approval, and then
used a new scoped credential block for the cutover and verification:

```powershell
$env:PGPASSWORD = $databasePassword
try {
  psql --host=$($uri.Host) --port=$($uri.Port) --username=$databaseUser `
    --dbname=$databaseName --file='scripts/database-refactor/002-normalize-engineering-organization.sql'

  psql --host=$($uri.Host) --port=$($uri.Port) --username=$databaseUser `
    --dbname=$databaseName --file='scripts/database-refactor/003-academic-organization-verify.sql'
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
```

Keep `PGPASSWORD` scoped only to the `try/finally` execution block shown above
and remove it immediately afterward. Never place the password in the command
line or documentation.

## Rollback strategy

- Any error before `COMMIT` automatically rolls back the entire cutover because
  file 2 uses one transaction and `ON_ERROR_STOP`.
- If a problem is discovered after commit, do not drop or overwrite the current
  database. Stop application traffic, restore the custom dump into a newly
  created recovery database, validate it, and switch `DATABASE_URL` only after
  owner approval. Keep the post-cutover database intact for diagnosis.
- Authentication tables are not changed by the cutover. The four fixture-linked
  Users, their roles, direct Program assignments, sessions, login attempts, and
  audit history are explicitly preserved and verified.
