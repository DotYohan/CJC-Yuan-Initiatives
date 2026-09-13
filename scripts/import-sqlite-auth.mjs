import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { PERMISSION_SEEDS, ROLE_SEEDS } from "../prisma/catalog.mjs";
import { createDatabase } from "../server/db.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REQUIRED_COMMIT_FLAGS = Object.freeze(["--commit", "--merge-seeded-demos", "--invalidate-sessions"]);
const KNOWN_FLAGS = new Set(REQUIRED_COMMIT_FLAGS);
const demoByUsername = new Map(
  ROLE_SEEDS.map((role) => [`${role.slug.replaceAll("_", "-")}.demo`, role])
);

const requiredDate = (value, field) => {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${field} is not a valid SQLite epoch timestamp.`);
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) throw new Error(`${field} is outside the supported timestamp range.`);
  return date;
};

const optionalDate = (value, field) => (value === null || value === undefined ? null : requiredDate(value, field));

const requiredUuid = (value, field) => {
  if (typeof value !== "string" || !UUID.test(value)) throw new Error(`${field} is not a valid UUID.`);
  return value;
};

const optionalUuid = (value, field) => (value === null || value === undefined ? null : requiredUuid(value, field));

const accountStatus = (value, field) => {
  if (value === "active") return "ACTIVE";
  if (value === "disabled") return "DISABLED";
  throw new Error(`${field} has unsupported account status ${JSON.stringify(value)}.`);
};

const parseMetadata = (value, id) => {
  try {
    const parsed = JSON.parse(value ?? "{}");
    if (parsed === null || Array.isArray(parsed) || typeof parsed !== "object") {
      throw new Error("metadata must be a JSON object");
    }
    if (Object.hasOwn(parsed, "_sqliteImport")) {
      throw new Error("metadata already contains reserved _sqliteImport data");
    }
    return parsed;
  } catch (error) {
    throw new Error(`audit_logs.id=${id} has invalid metadata_json: ${error.message}`);
  }
};

function readSource(sourcePath) {
  if (!existsSync(sourcePath)) throw new Error(`SQLite source does not exist: ${sourcePath}`);
  const database = new DatabaseSync(sourcePath, { readOnly: true });
  try {
    database.exec("BEGIN");
    const raw = {
      users: database.prepare("SELECT * FROM users ORDER BY created_at, id").all(),
      roles: database.prepare("SELECT * FROM roles ORDER BY id").all(),
      permissions: database.prepare("SELECT * FROM permissions ORDER BY id").all(),
      userRoles: database.prepare("SELECT * FROM user_roles ORDER BY user_id, role_id").all(),
      rolePermissions: database.prepare("SELECT * FROM role_permissions ORDER BY role_id, permission_id").all(),
      sessions: database.prepare("SELECT * FROM sessions ORDER BY created_at, token_hash").all(),
      resetTokens: database.prepare("SELECT * FROM password_reset_tokens ORDER BY created_at, id").all(),
      loginAttempts: database.prepare("SELECT * FROM login_attempts ORDER BY id").all(),
      auditLogs: database.prepare("SELECT * FROM audit_logs ORDER BY id").all(),
      rateLimits: database.prepare("SELECT * FROM rate_limits ORDER BY scope_key").all(),
      resetRequests: database.prepare("SELECT * FROM reset_requests ORDER BY id").all()
    };
    database.exec("COMMIT");

    const roleSlugBySourceId = new Map(raw.roles.map((role) => [role.id, role.slug]));
    const permissionSlugBySourceId = new Map(raw.permissions.map((permission) => [permission.id, permission.slug]));
    const userCreatedAt = new Map(
      raw.users.map((user) => [user.id, requiredDate(user.created_at, `users.${user.id}.created_at`)])
    );

    const snapshot = {
      roles: raw.roles.map((role) => ({ sourceId: role.id, slug: role.slug })),
      permissions: raw.permissions.map((permission) => ({ sourceId: permission.id, slug: permission.slug })),
      users: raw.users.map((user) => ({
        id: requiredUuid(user.id, `users.${user.id}.id`),
        username: user.username,
        usernameNormalized: user.username_normalized,
        displayName: user.display_name,
        email: user.email,
        emailNormalized: user.email_normalized,
        emailVerifiedAt: null,
        passwordHash: user.password_hash,
        status: accountStatus(user.status, `users.${user.id}.status`),
        mustChangePassword: user.must_change_password === 1,
        failedLoginCount: user.failed_login_count,
        lastFailedAt: optionalDate(user.last_failed_at, `users.${user.id}.last_failed_at`),
        lockUntil: optionalDate(user.lock_until, `users.${user.id}.lock_until`),
        authorizationVersion: user.authorization_version,
        passwordChangedAt: optionalDate(user.password_changed_at, `users.${user.id}.password_changed_at`),
        lastLoginAt: optionalDate(user.last_login_at, `users.${user.id}.last_login_at`),
        createdAt: userCreatedAt.get(user.id),
        updatedAt: requiredDate(user.updated_at, `users.${user.id}.updated_at`)
      })),
      userRoles: raw.userRoles.map((assignment) => ({
        userId: requiredUuid(assignment.user_id, `user_roles.${assignment.user_id}.user_id`),
        roleSlug: roleSlugBySourceId.get(assignment.role_id),
        isPrimary: assignment.is_primary === 1,
        assignedAt: userCreatedAt.get(assignment.user_id),
        assignedByUserId: null
      })),
      rolePermissions: raw.rolePermissions.map((grant) => ({
        roleSlug: roleSlugBySourceId.get(grant.role_id),
        permissionSlug: permissionSlugBySourceId.get(grant.permission_id)
      })),
      sessions: raw.sessions.map((session) => ({
        tokenHash: session.token_hash,
        userId: optionalUuid(session.user_id, `sessions.${session.token_hash}.user_id`),
        csrfHash: session.csrf_hash,
        authorizationVersion: session.authorization_version,
        rememberMe: session.remember_me === 1,
        createdAt: requiredDate(session.created_at, `sessions.${session.token_hash}.created_at`),
        lastSeenAt: requiredDate(session.last_seen_at, `sessions.${session.token_hash}.last_seen_at`),
        idleExpiresAt: requiredDate(session.idle_expires_at, `sessions.${session.token_hash}.idle_expires_at`),
        absoluteExpiresAt: requiredDate(session.absolute_expires_at, `sessions.${session.token_hash}.absolute_expires_at`),
        revokedAt: optionalDate(session.revoked_at, `sessions.${session.token_hash}.revoked_at`)
      })),
      resetTokens: raw.resetTokens.map((token) => ({
        id: requiredUuid(token.id, `password_reset_tokens.${token.id}.id`),
        userId: requiredUuid(token.user_id, `password_reset_tokens.${token.id}.user_id`),
        tokenHash: token.token_hash,
        requestedIpHash: token.requested_ip_hash,
        createdAt: requiredDate(token.created_at, `password_reset_tokens.${token.id}.created_at`),
        expiresAt: requiredDate(token.expires_at, `password_reset_tokens.${token.id}.expires_at`),
        usedAt: optionalDate(token.used_at, `password_reset_tokens.${token.id}.used_at`)
      })),
      loginAttempts: raw.loginAttempts.map((attempt) => ({
        id: BigInt(attempt.id),
        userId: optionalUuid(attempt.user_id, `login_attempts.${attempt.id}.user_id`),
        identifierHash: attempt.identifier_hash,
        ipHash: attempt.ip_hash,
        outcome: attempt.outcome,
        createdAt: requiredDate(attempt.created_at, `login_attempts.${attempt.id}.created_at`)
      })),
      auditLogs: raw.auditLogs.map((entry) => ({
        sourceId: String(entry.id),
        eventType: entry.event_type,
        outcome: entry.outcome,
        actorUserId: optionalUuid(entry.actor_user_id, `audit_logs.${entry.id}.actor_user_id`),
        targetUserId: optionalUuid(entry.target_user_id, `audit_logs.${entry.id}.target_user_id`),
        identifierHash: entry.identifier_hash,
        resourceType: null,
        resourceId: null,
        requestId: requiredUuid(entry.request_id, `audit_logs.${entry.id}.request_id`),
        ipHash: entry.ip_hash,
        method: entry.method,
        path: entry.path,
        metadata: parseMetadata(entry.metadata_json, entry.id),
        createdAt: requiredDate(entry.created_at, `audit_logs.${entry.id}.created_at`)
      })),
      rateLimits: raw.rateLimits.map((limit) => ({
        scopeKey: limit.scope_key,
        windowStartedAt: requiredDate(limit.window_started_at, `rate_limits.${limit.scope_key}.window_started_at`),
        attemptCount: limit.attempt_count
      })),
      resetRequests: raw.resetRequests.map((request) => ({
        id: BigInt(request.id),
        identifierHash: request.identifier_hash,
        ipHash: request.ip_hash,
        createdAt: requiredDate(request.created_at, `reset_requests.${request.id}.created_at`)
      }))
    };
    validateSnapshot(snapshot);
    return snapshot;
  } catch (error) {
    try {
      database.exec("ROLLBACK");
    } catch {
      // Preserve the original mapping error.
    }
    throw error;
  } finally {
    database.close();
  }
}

function validateSnapshot(snapshot) {
  const sourceUserIds = new Set(snapshot.users.map((user) => user.id));
  if (sourceUserIds.size !== snapshot.users.length) throw new Error("SQLite contains duplicate user UUIDs.");

  for (const field of ["usernameNormalized", "emailNormalized"]) {
    const seen = new Map();
    for (const user of snapshot.users) {
      const value = user[field];
      if (value === null || value === undefined) continue;
      const existing = seen.get(value);
      if (existing) throw new Error(`SQLite users ${existing} and ${user.id} share ${field}=${value}.`);
      seen.set(value, user.id);
    }
  }

  const assignmentsByUser = new Map(snapshot.users.map((user) => [user.id, []]));
  for (const assignment of snapshot.userRoles) {
    const assignments = assignmentsByUser.get(assignment.userId);
    if (!assignments) throw new Error(`A role assignment references unknown source user ${assignment.userId}.`);
    if (!assignment.roleSlug) throw new Error(`User ${assignment.userId} references an unknown source role.`);
    assignments.push(assignment);
  }
  for (const [userId, assignments] of assignmentsByUser) {
    if (!assignments.length) throw new Error(`Source user ${userId} has no role assignment.`);
    if (assignments.filter((assignment) => assignment.isPrimary).length !== 1) {
      throw new Error(`Source user ${userId} must have exactly one primary role.`);
    }
  }

  for (const grant of snapshot.rolePermissions) {
    if (!grant.roleSlug || !grant.permissionSlug) throw new Error("A source grant references an unknown role or permission.");
  }
  for (const user of snapshot.users) {
    if (typeof user.passwordHash !== "string" || user.passwordHash.length < 32) {
      throw new Error(`Source user ${user.id} has an invalid password hash.`);
    }
  }
}

const snapshotCounts = (snapshot) =>
  Object.fromEntries(Object.entries(snapshot).map(([name, rows]) => [name, rows.length]));

function assertRecognizedSeededDemo(user, seedAuditTargets) {
  const definition = demoByUsername.get(user.usernameNormalized);
  if (!definition) throw new Error(`Unexpected PostgreSQL user ${user.usernameNormalized}; cutover allows seeded demos only.`);
  const expectedEmail = `${definition.slug.replaceAll("_", "-")}.demo@cjc.invalid`;
  const roles = user.userRoles.map((assignment) => assignment.role.slug);
  const primary = user.userRoles.filter((assignment) => assignment.isPrimary);
  if (
    user.emailNormalized !== expectedEmail ||
    user.displayName !== `${definition.name} Demo Account` ||
    user.status !== "ACTIVE" ||
    user.mustChangePassword !== true ||
    roles.length !== 1 ||
    roles[0] !== definition.slug ||
    primary.length !== 1 ||
    !seedAuditTargets.has(user.id)
  ) {
    throw new Error(`PostgreSQL user ${user.usernameNormalized} is not an untouched recognized demo account.`);
  }
  return definition;
}

async function destinationCounts(transaction) {
  const [users, roles, permissions, userRoles, rolePermissions, sessions, resetTokens, loginAttempts, auditLogs, rateLimits, resetRequests] =
    await Promise.all([
      transaction.user.count(),
      transaction.role.count(),
      transaction.permission.count(),
      transaction.userRole.count(),
      transaction.rolePermission.count(),
      transaction.session.count(),
      transaction.passwordResetToken.count(),
      transaction.loginAttempt.count(),
      transaction.auditLog.count(),
      transaction.rateLimit.count(),
      transaction.resetRequest.count()
    ]);
  return { users, roles, permissions, userRoles, rolePermissions, sessions, resetTokens, loginAttempts, auditLogs, rateLimits, resetRequests };
}

async function resetImportedSequences(transaction) {
  for (const table of ["login_attempts", "reset_requests"]) {
    await transaction.$queryRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE(MAX(id), 1), COUNT(*) > 0) FROM "${table}"`
    );
  }
}

function remapUserId(sourceUserId, userIdMap, field) {
  if (sourceUserId === null || sourceUserId === undefined) return null;
  const destinationUserId = userIdMap.get(sourceUserId);
  if (!destinationUserId) throw new Error(`${field} references unmapped source user ${sourceUserId}.`);
  return destinationUserId;
}

async function importSnapshot(prisma, snapshot, options = {}) {
  if (
    options.commit !== true ||
    options.mergeSeededDemos !== true ||
    options.invalidateSessions !== true ||
    process.env.ALLOW_SQLITE_IMPORT !== "true"
  ) {
    throw new Error(
      "Cutover requires --commit, --merge-seeded-demos, --invalidate-sessions, and ALLOW_SQLITE_IMPORT=true."
    );
  }
  validateSnapshot(snapshot);
  const cutoverId = randomUUID();
  const cutoverAt = new Date();

  return prisma.$transaction(
    async (transaction) => {
      await transaction.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext('cjc-auth-sqlite-cutover-v1'))");
      const before = await destinationCounts(transaction);

      const [destinationRoles, destinationPermissions, destinationGrants, destinationUsers, seedAudits] = await Promise.all([
        transaction.role.findMany(),
        transaction.permission.findMany(),
        transaction.rolePermission.findMany({ include: { role: true, permission: true } }),
        transaction.user.findMany({ include: { userRoles: { include: { role: true } } } }),
        transaction.auditLog.findMany({
          where: { eventType: "account.demo_seeded", targetUserId: { not: null } },
          select: { targetUserId: true }
        })
      ]);

      const rolesBySlug = new Map(destinationRoles.map((role) => [role.slug, role]));
      const permissionsBySlug = new Map(destinationPermissions.map((permission) => [permission.slug, permission]));
      const destinationGrantKeys = new Set(
        destinationGrants.map((grant) => `${grant.role.slug}\u0000${grant.permission.slug}`)
      );
      const missingRoles = snapshot.roles.map((role) => role.slug).filter((slug) => !rolesBySlug.has(slug));
      const missingPermissions = snapshot.permissions
        .map((permission) => permission.slug)
        .filter((slug) => !permissionsBySlug.has(slug));
      const missingGrants = snapshot.rolePermissions.filter(
        (grant) => !destinationGrantKeys.has(`${grant.roleSlug}\u0000${grant.permissionSlug}`)
      );
      if (missingRoles.length || missingPermissions.length || missingGrants.length) {
        throw new Error(
          `PostgreSQL authorization catalog is incomplete: ${JSON.stringify({ missingRoles, missingPermissions, missingGrants })}`
        );
      }

      const unexpectedSecurityData = {
        resetTokens: before.resetTokens,
        loginAttempts: before.loginAttempts,
        rateLimits: before.rateLimits,
        resetRequests: before.resetRequests
      };
      if (Object.values(unexpectedSecurityData).some((count) => count !== 0)) {
        throw new Error(`PostgreSQL contains unexpected cutover data: ${JSON.stringify(unexpectedSecurityData)}`);
      }

      const seedAuditTargets = new Set(seedAudits.map((entry) => entry.targetUserId));
      for (const user of destinationUsers) assertRecognizedSeededDemo(user, seedAuditTargets);

      const byUsername = new Map(destinationUsers.map((user) => [user.usernameNormalized, user]));
      const byEmail = new Map(
        destinationUsers.filter((user) => user.emailNormalized).map((user) => [user.emailNormalized, user])
      );
      const byId = new Map(destinationUsers.map((user) => [user.id, user]));
      const userIdMap = new Map();
      const matchedDestinationIds = new Set();
      const userMappings = [];

      for (const sourceUser of snapshot.users) {
        const usernameMatch = byUsername.get(sourceUser.usernameNormalized) ?? null;
        const emailMatch = sourceUser.emailNormalized ? byEmail.get(sourceUser.emailNormalized) ?? null : null;
        if (usernameMatch && emailMatch && usernameMatch.id !== emailMatch.id) {
          throw new Error(`Username and email for source user ${sourceUser.id} match different PostgreSQL users.`);
        }
        const matched = usernameMatch ?? emailMatch;
        if (matched) {
          assertRecognizedSeededDemo(matched, seedAuditTargets);
          if (
            matched.usernameNormalized !== sourceUser.usernameNormalized ||
            (matched.emailNormalized && sourceUser.emailNormalized && matched.emailNormalized !== sourceUser.emailNormalized)
          ) {
            throw new Error(`Normalized identifiers do not fully agree for source user ${sourceUser.id}.`);
          }
          if (matchedDestinationIds.has(matched.id)) {
            throw new Error(`More than one source user maps to PostgreSQL user ${matched.id}.`);
          }
          userIdMap.set(sourceUser.id, matched.id);
          matchedDestinationIds.add(matched.id);
          userMappings.push({
            username: sourceUser.usernameNormalized,
            sourceUserId: sourceUser.id,
            destinationUserId: matched.id,
            strategy: "merged_seeded_demo"
          });
          continue;
        }
        if (byId.has(sourceUser.id)) {
          throw new Error(`Source UUID ${sourceUser.id} is already used by an unrelated PostgreSQL user.`);
        }
        userIdMap.set(sourceUser.id, sourceUser.id);
        userMappings.push({
          username: sourceUser.usernameNormalized,
          sourceUserId: sourceUser.id,
          destinationUserId: sourceUser.id,
          strategy: "created_with_source_uuid"
        });
      }

      for (const destinationUser of destinationUsers) {
        if (matchedDestinationIds.has(destinationUser.id)) continue;
        const definition = assertRecognizedSeededDemo(destinationUser, seedAuditTargets);
        if (definition.slug !== "faculty") {
          throw new Error(`Unexpected unmatched PostgreSQL demo user ${destinationUser.usernameNormalized}.`);
        }
      }

      const assignmentsBySourceUser = new Map(snapshot.users.map((user) => [user.id, []]));
      for (const assignment of snapshot.userRoles) assignmentsBySourceUser.get(assignment.userId).push(assignment);

      for (const sourceUser of snapshot.users) {
        const destinationUserId = userIdMap.get(sourceUser.id);
        const existing = byId.get(destinationUserId);
        const { id: _sourceId, authorizationVersion: sourceAuthorizationVersion, ...authenticationData } = sourceUser;
        const authorizationVersion = Math.max(sourceAuthorizationVersion, existing?.authorizationVersion ?? 0) + 1;
        if (existing) {
          await transaction.user.update({
            where: { id: destinationUserId },
            data: { ...authenticationData, authorizationVersion }
          });
        } else {
          await transaction.user.create({
            data: { ...authenticationData, id: destinationUserId, authorizationVersion }
          });
        }

        await transaction.userRole.deleteMany({ where: { userId: destinationUserId } });
        await transaction.userRole.createMany({
          data: assignmentsBySourceUser.get(sourceUser.id).map((assignment) => ({
            userId: destinationUserId,
            roleId: rolesBySlug.get(assignment.roleSlug).id,
            isPrimary: assignment.isPrimary,
            assignedAt: assignment.assignedAt,
            assignedByUserId: null
          }))
        });
      }

      const existingSessionHashes = new Set(
        (await transaction.session.findMany({ select: { tokenHash: true } })).map((session) => session.tokenHash)
      );
      const sessionCollisions = snapshot.sessions
        .map((session) => session.tokenHash)
        .filter((tokenHash) => existingSessionHashes.has(tokenHash));
      if (sessionCollisions.length) throw new Error("A source session token hash already exists in PostgreSQL.");

      const revokedExistingSessions = await transaction.session.updateMany({
        where: { revokedAt: null },
        data: { revokedAt: cutoverAt }
      });
      if (snapshot.sessions.length) {
        await transaction.session.createMany({
          data: snapshot.sessions.map((session) => ({
            ...session,
            userId: remapUserId(session.userId, userIdMap, `sessions.${session.tokenHash}.userId`),
            revokedAt: cutoverAt
          }))
        });
      }

      if (snapshot.resetTokens.length) {
        await transaction.passwordResetToken.createMany({
          data: snapshot.resetTokens.map((token) => ({
            ...token,
            userId: remapUserId(token.userId, userIdMap, `password_reset_tokens.${token.id}.userId`)
          }))
        });
      }
      if (snapshot.loginAttempts.length) {
        await transaction.loginAttempt.createMany({
          data: snapshot.loginAttempts.map((attempt) => ({
            ...attempt,
            userId: remapUserId(attempt.userId, userIdMap, `login_attempts.${attempt.id}.userId`)
          }))
        });
      }

      if (snapshot.auditLogs.length) {
        await transaction.auditLog.createMany({
          data: snapshot.auditLogs.map(({ sourceId, metadata, ...entry }) => ({
            ...entry,
            actorUserId: remapUserId(entry.actorUserId, userIdMap, `audit_logs.${sourceId}.actorUserId`),
            targetUserId: remapUserId(entry.targetUserId, userIdMap, `audit_logs.${sourceId}.targetUserId`),
            resourceId:
              entry.resourceType === "user" && entry.resourceId && userIdMap.has(entry.resourceId)
                ? userIdMap.get(entry.resourceId)
                : entry.resourceId,
            metadata: {
              ...metadata,
              _sqliteImport: {
                cutoverId,
                sourceTable: "audit_logs",
                sourceId,
                importedAt: cutoverAt.toISOString()
              }
            }
          }))
        });
      }
      if (snapshot.rateLimits.length) await transaction.rateLimit.createMany({ data: snapshot.rateLimits });
      if (snapshot.resetRequests.length) await transaction.resetRequest.createMany({ data: snapshot.resetRequests });
      await resetImportedSequences(transaction);

      const after = await destinationCounts(transaction);
      const activeSessionsAfterCutover = await transaction.session.count({ where: { revokedAt: null } });
      const replacedRoleCount = destinationUsers
        .filter((user) => matchedDestinationIds.has(user.id))
        .reduce((total, user) => total + user.userRoles.length, 0);
      const createdUserCount = userMappings.filter((mapping) => mapping.strategy === "created_with_source_uuid").length;
      const expected = {
        users: before.users + createdUserCount,
        roles: before.roles,
        permissions: before.permissions,
        userRoles: before.userRoles - replacedRoleCount + snapshot.userRoles.length,
        rolePermissions: before.rolePermissions,
        sessions: before.sessions + snapshot.sessions.length,
        resetTokens: before.resetTokens + snapshot.resetTokens.length,
        loginAttempts: before.loginAttempts + snapshot.loginAttempts.length,
        auditLogs: before.auditLogs + snapshot.auditLogs.length,
        rateLimits: before.rateLimits + snapshot.rateLimits.length,
        resetRequests: before.resetRequests + snapshot.resetRequests.length
      };
      if (Object.entries(expected).some(([name, count]) => after[name] !== count) || activeSessionsAfterCutover !== 0) {
        throw new Error(
          `Post-import invariants failed: ${JSON.stringify({ expected, actual: after, activeSessionsAfterCutover })}`
        );
      }
      return {
        status: "success",
        cutoverId,
        startedAt: cutoverAt.toISOString(),
        sourceCounts: snapshotCounts(snapshot),
        destinationBefore: before,
        destinationAfter: after,
        catalog: {
          rolesPreserved: destinationRoles.length,
          permissionsPreserved: destinationPermissions.length,
          grantsPreserved: destinationGrants.length
        },
        users: {
          merged: userMappings.filter((mapping) => mapping.strategy === "merged_seeded_demo").length,
          createdWithSourceUuid: userMappings.filter((mapping) => mapping.strategy === "created_with_source_uuid").length,
          mappings: userMappings
        },
        sessions: {
          existingRevoked: revokedExistingSessions.count,
          importedRevoked: snapshot.sessions.length,
          activeAfterCutover: activeSessionsAfterCutover
        },
        auditLogs: {
          existingPreserved: before.auditLogs,
          imported: snapshot.auditLogs.length,
          sourceIdsStoredInMetadata: true
        }
      };
    },
    { isolationLevel: "Serializable", maxWait: 10_000, timeout: 120_000 }
  );
}

async function writeMigrationReport(report, outputPath) {
  const reportPath = resolve(outputPath ?? `reports/auth-cutover-${report.cutoverId}.json`);
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(
    reportPath,
    `${JSON.stringify({ ...report, completedAt: new Date().toISOString() }, null, 2)}\n`,
    { encoding: "utf8", flag: "wx", mode: 0o600 }
  );
  return reportPath;
}

function parseFlags(args) {
  const unknown = args.filter((argument) => argument.startsWith("--") && !KNOWN_FLAGS.has(argument));
  if (unknown.length) throw new Error(`Unknown importer flags: ${unknown.join(", ")}`);
  const flags = new Set(args);
  return {
    commit: flags.has("--commit"),
    mergeSeededDemos: flags.has("--merge-seeded-demos"),
    invalidateSessions: flags.has("--invalidate-sessions")
  };
}

async function runCli() {
  const flags = parseFlags(process.argv.slice(2));
  const sourcePath = resolve(process.env.SQLITE_SOURCE_PATH ?? "./data/cjc-portal.sqlite");
  const snapshot = readSource(sourcePath);
  const counts = snapshotCounts(snapshot);
  if (!flags.commit) {
    process.stdout.write(`SQLite authentication import dry run passed.\n${JSON.stringify(counts, null, 2)}\n`);
    process.stdout.write("No PostgreSQL connection was opened and no data was written.\n");
    return;
  }
  const missingFlags = REQUIRED_COMMIT_FLAGS.filter((flag) => !process.argv.includes(flag));
  if (missingFlags.length || process.env.ALLOW_SQLITE_IMPORT !== "true") {
    throw new Error(
      `Committing requires ALLOW_SQLITE_IMPORT=true and flags: ${REQUIRED_COMMIT_FLAGS.join(" ")}.` +
        (missingFlags.length ? ` Missing: ${missingFlags.join(", ")}.` : "")
    );
  }

  const prisma = createDatabase();
  let report;
  try {
    report = await importSnapshot(prisma, snapshot, flags);
  } finally {
    await prisma.$disconnect();
  }

  let reportPath;
  try {
    reportPath = await writeMigrationReport(report, process.env.MIGRATION_REPORT_PATH);
  } catch (error) {
    throw new Error(`PostgreSQL cutover committed, but the migration report could not be written: ${error.message}`);
  }
  process.stdout.write(`SQLite authentication cutover completed.\nReport: ${reportPath}\n`);
  process.stdout.write(`${JSON.stringify(report.destinationAfter, null, 2)}\n`);
}

export { importSnapshot, parseFlags, readSource, snapshotCounts, validateSnapshot, writeMigrationReport };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runCli();
}
