import { randomUUID as newId } from "node:crypto";
import { Prisma } from "@prisma/client";

const asDate = (value) => (value instanceof Date ? value : (value != null ? new Date(value) : new Date()));
const asMillis = (value) => (value ? value.getTime() : null);
const userInclude = {
  userRoles: {
    include: { role: true },
    orderBy: [{ isPrimary: "desc" }, { role: { name: "asc" } }]
  },
  programAssignments: {
    include: { program: { select: { id: true, code: true, name: true } } },
    take: 1
  },
  departmentAssignments: {
    include: {
      department: {
        select: {
          id: true,
          code: true,
          name: true,
          college: { select: { id: true, code: true, name: true } }
        }
      }
    },
    take: 1
  },
  collegeAssignments: {
    include: {
      college: {
        select: {
          id: true,
          code: true,
          name: true,
          shortName: true
        }
      }
    },
    take: 1
  }
};

function mapRoleAssignment(assignment) {
  return {
    id: assignment.role.id,
    slug: assignment.role.slug,
    name: assignment.role.name,
    landing_path: assignment.role.landingPath,
    is_primary: assignment.isPrimary ? 1 : 0
  };
}

function mapUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    username_normalized: user.usernameNormalized,
    display_name: user.displayName,
    email: user.email,
    email_normalized: user.emailNormalized,
    password_hash: user.passwordHash,
    status: user.status.toLowerCase(),
    must_change_password: user.mustChangePassword ? 1 : 0,
    failed_login_count: user.failedLoginCount,
    last_failed_at: asMillis(user.lastFailedAt),
    lock_until: asMillis(user.lockUntil),
    authorization_version: user.authorizationVersion,
    password_changed_at: asMillis(user.passwordChangedAt),
    last_login_at: asMillis(user.lastLoginAt),
    deleted_at: asMillis(user.deletedAt),
    created_at: asMillis(user.createdAt),
    updated_at: asMillis(user.updatedAt),
    assigned_program: user.programAssignments?.[0]?.program ?? null,
    assignedProgram: user.programAssignments?.[0]?.program ?? null,
    assigned_department: user.departmentAssignments?.[0]?.department ?? null,
    assignedDepartment: user.departmentAssignments?.[0]?.department ?? null,
    assigned_college: user.collegeAssignments?.[0]?.college ?? null,
    assignedCollege: user.collegeAssignments?.[0]?.college ?? null,
    roles: (user.userRoles ?? []).map(mapRoleAssignment)
  };
}

function mapSession(session) {
  if (!session) return null;
  return {
    token_hash: session.tokenHash,
    user_id: session.userId,
    csrf_hash: session.csrfHash,
    authorization_version: session.authorizationVersion,
    remember_me: session.rememberMe ? 1 : 0,
    created_at: asMillis(session.createdAt),
    last_seen_at: asMillis(session.lastSeenAt),
    idle_expires_at: asMillis(session.idleExpiresAt),
    absolute_expires_at: asMillis(session.absoluteExpiresAt),
    revoked_at: asMillis(session.revokedAt)
  };
}

export class AuthenticationStore {
  constructor(prisma, config = {}) {
    this.prisma = prisma;
    this.config = { now: () => Date.now(), ...config };
  }

  async transaction(operation) {
    if (typeof this.prisma.$transaction !== "function") return operation(this);
    return this.prisma.$transaction(
      (transaction) => operation(new AuthenticationStore(transaction, this.config)),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  async userByIdentifier(identifier) {
    return mapUser(
      await this.prisma.user.findFirst({
        where: { deletedAt: null, OR: [{ usernameNormalized: identifier }, { emailNormalized: identifier }] },
        include: userInclude
      })
    );
  }

  async userById(id) {
    return mapUser(await this.prisma.user.findFirst({ where: { id, deletedAt: null }, include: userInclude }));
  }

  async findUserForGoogleAuth(googleSub, email) {
    const normalizedEmail = (email || "").trim().toLowerCase();

    // 1. Search by linked googleSub
    if (googleSub) {
      const linked = await this.prisma.userGoogleAuth.findUnique({
        where: { googleSub },
        include: { user: { include: userInclude } }
      });
      if (linked?.user && !linked.user.deletedAt) {
        return mapUser(linked.user);
      }
    }

    // 2. Search User by emailNormalized / usernameNormalized
    const userByEmail = await this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { emailNormalized: normalizedEmail },
          { usernameNormalized: normalizedEmail }
        ]
      },
      include: userInclude
    });
    if (userByEmail) return mapUser(userByEmail);

    // 3. Search Student by institutionalEmail
    const student = await this.prisma.student.findFirst({
      where: {
        institutionalEmail: { equals: normalizedEmail, mode: "insensitive" },
        user: { deletedAt: null }
      },
      include: { user: { include: userInclude } }
    });
    if (student?.user) return mapUser(student.user);

    // 4. Search Faculty by institutionalEmail
    const faculty = await this.prisma.faculty.findFirst({
      where: {
        institutionalEmail: { equals: normalizedEmail, mode: "insensitive" },
        user: { deletedAt: null }
      },
      include: { user: { include: userInclude } }
    });
    if (faculty?.user) return mapUser(faculty.user);

    return null;
  }

  async linkGoogleAuth(userId, { googleSub, email, picture }) {
    const now = asDate(this.config.now());
    const normalized = (email || "").trim().toLowerCase();
    if (googleSub) {
      await this.prisma.userGoogleAuth.deleteMany({
        where: { googleSub, userId: { not: userId } }
      });
    }
    return this.prisma.userGoogleAuth.upsert({
      where: { userId },
      update: {
        googleSub,
        email: normalized,
        emailNormalized: normalized,
        avatarUrl: picture || null,
        lastLoginAt: now
      },
      create: {
        id: newId(),
        userId,
        googleSub,
        email: normalized,
        emailNormalized: normalized,
        avatarUrl: picture || null,
        linkedAt: now,
        lastLoginAt: now
      }
    });
  }

  rolesForUser(user) {
    return user?.roles ?? [];
  }

  async permissionsForUser(userId) {
    return this.prisma.permission.findMany({
      where: { rolePermissions: { some: { role: { userRoles: { some: { userId } } } } } },
      select: { slug: true },
      orderBy: { slug: "asc" }
    });
  }

  async sessionByHash(tokenHash) {
    return mapSession(await this.prisma.session.findUnique({ where: { tokenHash } }));
  }

  async insertSession(values) {
    return mapSession(await this.prisma.session.create({
      data: {
        tokenHash: values.tokenHash, userId: values.userId, csrfHash: values.csrfHash,
        authorizationVersion: values.authorizationVersion, rememberMe: values.remember,
        createdAt: asDate(values.createdAt), lastSeenAt: asDate(values.lastSeenAt),
        idleExpiresAt: asDate(values.idleExpiresAt), absoluteExpiresAt: asDate(values.absoluteExpiresAt)
      }
    }));
  }

  async touchSession(tokenHash, lastSeenAt, idleExpiresAt) {
    await this.prisma.session.updateMany({ where: { tokenHash, revokedAt: null }, data: { lastSeenAt: asDate(lastSeenAt), idleExpiresAt: asDate(idleExpiresAt) } });
  }

  async rotateCsrf(tokenHash, csrfHash) {
    await this.prisma.session.updateMany({ where: { tokenHash, revokedAt: null }, data: { csrfHash } });
  }

  async revokeSession(tokenHash, now) {
    await this.prisma.session.updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: asDate(now) } });
  }

  async revokeUserSessions(userId, now) {
    await this.prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: asDate(now) } });
  }

  async consumeRateLimit(scopeKey, limit, windowMs, now, retentionCutoff, cleanupBatchSize) {
    return this.transaction(async (store) => {
      await store.pruneRateLimits(retentionCutoff, cleanupBatchSize);
      const current = await store.prisma.rateLimit.findUnique({ where: { scopeKey } });
      if (!current || current.windowStartedAt.getTime() + windowMs <= now) {
        await store.prisma.rateLimit.upsert({
          where: { scopeKey },
          create: { scopeKey, windowStartedAt: asDate(now), attemptCount: 1 },
          update: { windowStartedAt: asDate(now), attemptCount: 1 }
        });
        return true;
      }
      if (current.attemptCount >= limit) return false;
      await store.prisma.rateLimit.update({ where: { scopeKey }, data: { attemptCount: { increment: 1 } } });
      return true;
    });
  }

  async releaseRateLimit(scopeKey) {
    await this.prisma.rateLimit.updateMany({ where: { scopeKey, attemptCount: { gt: 0 } }, data: { attemptCount: { decrement: 1 } } });
  }

  async clearRateLimit(scopeKey) {
    await this.prisma.rateLimit.deleteMany({ where: { scopeKey } });
  }

  async pruneRateLimits(cutoff, batch) {
    const rows = await this.prisma.rateLimit.findMany({ where: { windowStartedAt: { lt: asDate(cutoff) } }, select: { scopeKey: true }, orderBy: { windowStartedAt: "asc" }, take: batch });
    if (rows.length) await this.prisma.rateLimit.deleteMany({ where: { scopeKey: { in: rows.map((row) => row.scopeKey) } } });
  }

  async pruneSecurityState(now, config) {
    await this.transaction(async (store) => {
      const batch = config.cleanupBatchSize;
      const sessions = await store.prisma.session.findMany({
        where: { OR: [{ idleExpiresAt: { lte: asDate(now) } }, { absoluteExpiresAt: { lte: asDate(now) } }, { revokedAt: { lte: asDate(now - config.revokedSessionRetentionMs) } }] },
        select: { tokenHash: true }, orderBy: { createdAt: "asc" }, take: batch
      });
      if (sessions.length) await store.prisma.session.deleteMany({ where: { tokenHash: { in: sessions.map((row) => row.tokenHash) } } });

      const resetTokens = await store.prisma.passwordResetToken.findMany({
        where: { OR: [{ expiresAt: { lte: asDate(now) } }, { usedAt: { lte: asDate(now - config.usedResetTokenRetentionMs) } }] },
        select: { id: true }, orderBy: { createdAt: "asc" }, take: batch
      });
      if (resetTokens.length) await store.prisma.passwordResetToken.deleteMany({ where: { id: { in: resetTokens.map((row) => row.id) } } });

      for (const model of [store.prisma.loginAttempt, store.prisma.resetRequest]) {
        const rows = await model.findMany({ where: { createdAt: { lt: asDate(now - config.authHistoryRetentionMs) } }, select: { id: true }, orderBy: { createdAt: "asc" }, take: batch });
        if (rows.length) await model.deleteMany({ where: { id: { in: rows.map((row) => row.id) } } });
      }
      const retention = Math.max(config.loginWindowMs, config.resetWindowMs, config.resetAttemptWindowMs, config.changePasswordWindowMs) * 2;
      await store.pruneRateLimits(now - retention, batch);
    });
  }

  async insertLoginAttempt({ userId, identifierHash, ipHash, outcome, createdAt }) {
    await this.prisma.loginAttempt.create({ data: { userId, identifierHash, ipHash, outcome, createdAt: asDate(createdAt) } });
  }

  async insertResetRequest(identifierHash, ipHash, createdAt) {
    await this.prisma.resetRequest.create({ data: { identifierHash, ipHash, createdAt: asDate(createdAt) } });
  }

  async insertResetToken(values) {
    await this.prisma.passwordResetToken.create({ data: {
      id: values.id, userId: values.userId, tokenHash: values.tokenHash,
      requestedIpHash: values.requestedIpHash, createdAt: asDate(values.createdAt), expiresAt: asDate(values.expiresAt)
    } });
  }

  async resetTokenByHash(tokenHash) {
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash }, include: { user: true } });
    if (!record) return null;
    return { id: record.id, user_id: record.userId, token_hash: record.tokenHash, created_at: asMillis(record.createdAt), expires_at: asMillis(record.expiresAt), used_at: asMillis(record.usedAt), status: record.user.status.toLowerCase() };
  }

  async completePasswordReset({ resetRecord, encoded, now, anonymousTokenHash, resetRateKey }) {
    return this.transaction(async (store) => {
      const consumed = await store.prisma.passwordResetToken.updateMany({ where: { id: resetRecord.id, usedAt: null, expiresAt: { gt: asDate(now) } }, data: { usedAt: asDate(now) } });
      if (consumed.count !== 1) return false;
      await store.prisma.user.update({ where: { id: resetRecord.user_id }, data: {
        passwordHash: encoded, mustChangePassword: false, failedLoginCount: 0, lastFailedAt: null, lockUntil: null,
        authorizationVersion: { increment: 1 }, passwordChangedAt: asDate(now), updatedAt: asDate(now)
      } });
      await store.prisma.passwordResetToken.updateMany({ where: { userId: resetRecord.user_id, usedAt: null }, data: { usedAt: asDate(now) } });
      await store.revokeUserSessions(resetRecord.user_id, now);
      await store.revokeSession(anonymousTokenHash, now);
      await store.clearRateLimit(`password-change-user:${resetRecord.user_id}`);
      await store.releaseRateLimit(resetRateKey);
      return true;
    });
  }

  async recordSuccessfulLogin(userId, originalHash, passwordHash, now, ipRateKey, attempt) {
    return this.transaction(async (store) => {
      const updated = await store.prisma.user.updateMany({ where: { id: userId, passwordHash: originalHash, status: "ACTIVE" }, data: {
        passwordHash, failedLoginCount: 0, lastFailedAt: null, lockUntil: null, lastLoginAt: asDate(now), updatedAt: asDate(now)
      } });
      if (updated.count !== 1) return null;
      await store.releaseRateLimit(ipRateKey);
      await store.insertLoginAttempt(attempt);
      return store.userById(userId);
    });
  }

  async recordFailedLogin(user, { failures, lockUntil, now, attempt }) {
    await this.transaction(async (store) => {
      if (user) await store.prisma.user.updateMany({ where: { id: user.id, passwordHash: user.password_hash, status: "ACTIVE" }, data: {
        failedLoginCount: failures, lastFailedAt: asDate(now), lockUntil: lockUntil ? asDate(lockUntil) : null, updatedAt: asDate(now)
      } });
      await store.insertLoginAttempt(attempt);
    });
  }

  async changePassword({ user, encoded, now, userRateKey, ipRateKey }) {
    return this.transaction(async (store) => {
      const updated = await store.prisma.user.updateMany({ where: { id: user.id, passwordHash: user.password_hash, authorizationVersion: user.authorization_version }, data: {
        passwordHash: encoded, mustChangePassword: false, authorizationVersion: { increment: 1 }, passwordChangedAt: asDate(now), updatedAt: asDate(now)
      } });
      if (updated.count !== 1) return null;
      await store.revokeUserSessions(user.id, now);
      await store.clearRateLimit(userRateKey);
      await store.releaseRateLimit(ipRateKey);
      return store.userById(user.id);
    });
  }

  async createUser(values) {
    const roleSlug = values.roleSlug || values.role;
    const role = roleSlug ? await this.prisma.role.findUnique({ where: { slug: roleSlug }, select: { id: true, slug: true } }) : null;
    if (!role) throw new Error("ROLE_INVALID");
    let program = null;
    if (role.slug === "program_head") {
      if (typeof values.programId !== "string" || !values.programId) throw new Error("PROGRAM_REQUIRED");
      program = await this.prisma.program.findFirst({
        where: {
          id: values.programId,
          isActive: true,
          department: { is: { isActive: true, college: { is: { isActive: true } } } }
        },
        select: { id: true }
      });
      if (!program) throw new Error("PROGRAM_INVALID");
    }
    let department = null;
    if (role.slug === "student_assistant") {
      if (typeof values.departmentId !== "string" || !values.departmentId) throw new Error("DEPARTMENT_REQUIRED");
      department = await this.prisma.department.findFirst({
        where: {
          id: values.departmentId,
          isActive: true,
          college: { is: { isActive: true } }
        },
        select: { id: true }
      });
      if (!department) throw new Error("DEPARTMENT_INVALID");
    }
    let college = null;
    if (role.slug === "dean") {
      if (typeof values.collegeId !== "string" || !values.collegeId) throw new Error("COLLEGE_REQUIRED");
      college = await this.prisma.college.findFirst({
        where: {
          id: values.collegeId,
          isActive: true
        },
        select: { id: true }
      });
      if (!college) throw new Error("COLLEGE_INVALID");
    }
    return mapUser(await this.prisma.user.create({ data: {
      id: values.id, username: values.username, usernameNormalized: values.usernameNormalized,
      displayName: values.displayName, email: values.email, emailNormalized: values.emailNormalized,
      passwordHash: values.passwordHash, status: "ACTIVE", mustChangePassword: values.mustChangePassword,
      createdAt: asDate(values.now), updatedAt: asDate(values.now),
      userRoles: { create: { roleId: role.id, isPrimary: true, assignedByUserId: values.assignedByUserId } },
      programAssignments: program ? { create: { id: values.programAssignmentId || newId(), programId: program.id, assignedByUserId: values.assignedByUserId } } : undefined,
      departmentAssignments: department ? { create: { id: values.departmentAssignmentId || newId(), departmentId: department.id, assignedByUserId: values.assignedByUserId } } : undefined,
      collegeAssignments: college ? { create: { id: values.collegeAssignmentId || newId(), collegeId: college.id, assignedByUserId: values.assignedByUserId } } : undefined
    }, include: userInclude }));
  }

  async listPrograms() {
    return this.prisma.program.findMany({
      where: {
        isActive: true,
        department: { is: { isActive: true, college: { is: { isActive: true } } } }
      },
      select: { id: true, code: true, name: true },
      orderBy: [{ code: "asc" }, { name: "asc" }]
    });
  }

  async listDepartments() {
    return this.prisma.department.findMany({
      where: {
        isActive: true,
        college: { is: { isActive: true } }
      },
      select: {
        id: true,
        code: true,
        name: true,
        college: { select: { id: true, code: true, name: true } }
      },
      orderBy: [{ college: { name: "asc" } }, { code: "asc" }]
    });
  }

  async listColleges() {
    return this.prisma.college.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, shortName: true },
      orderBy: [{ code: "asc" }, { name: "asc" }]
    });
  }

  async listUsers() {
    return (await this.prisma.user.findMany({ where: { deletedAt: null }, include: userInclude, orderBy: [{ createdAt: "desc" }, { username: "asc" }] })).map(mapUser);
  }

  async listRoles() {
    return this.prisma.role.findMany({ select: { id: true, slug: true, name: true, landingPath: true }, orderBy: { id: "asc" } });
  }

  async updateStatus(userId, status, now) {
    const result = await this.prisma.user.updateMany({ where: { id: userId, deletedAt: null }, data: { status: status.toUpperCase(), authorizationVersion: { increment: 1 }, updatedAt: asDate(now) } });
    if (result.count !== 1) return null;
    await this.revokeUserSessions(userId, now);
    return this.userById(userId);
  }

  async updateRoles(userId, roles, primaryRole, assignedByUserId, now) {
    return this.transaction(async (store) => {
      if (!(await store.userById(userId))) return null;
      const roleRows = await store.prisma.role.findMany({ where: { slug: { in: roles } }, select: { id: true, slug: true } });
      if (roleRows.length !== roles.length) return false;
      await store.prisma.userRole.deleteMany({ where: { userId } });
      await store.prisma.userRole.createMany({ data: roleRows.map((role) => ({ userId, roleId: role.id, isPrimary: role.slug === primaryRole, assignedByUserId })) });
      await store.prisma.user.update({ where: { id: userId }, data: { authorizationVersion: { increment: 1 }, updatedAt: asDate(now) } });
      await store.revokeUserSessions(userId, now);
      return store.userById(userId);
    });
  }

  async insertAudit(values) {
    await this.prisma.auditLog.create({ data: {
      eventType: values.eventType, outcome: values.outcome, actorUserId: values.actorUserId,
      targetUserId: values.targetUserId, identifierHash: values.identifierHash,
      resourceType: values.resourceType ?? null, resourceId: values.resourceId ?? null,
      requestId: values.requestId, ipHash: values.ipHash, method: values.method,
      path: values.path, metadata: values.metadata, createdAt: asDate(values.createdAt)
    } });
  }

  async listAudit(limit) {
    const entries = await this.prisma.auditLog.findMany({ orderBy: { id: "desc" }, take: limit });
    return entries.map((entry) => ({
      id: Number(entry.id), eventType: entry.eventType, outcome: entry.outcome,
      actorUserId: entry.actorUserId, targetUserId: entry.targetUserId,
      identifierHash: entry.identifierHash, requestId: entry.requestId, ipHash: entry.ipHash,
      method: entry.method, path: entry.path, metadata: entry.metadata, createdAt: entry.createdAt.getTime()
    }));
  }

  async deleteUser(userId) {
    return this.transaction(async (store) => {
      const user = await store.userById(userId);
      if (!user) return false;
      const now = store.config.now();
      const tombstone = `deleted-${userId.replace(/-/g, "")}`.slice(0, 64);
      await store.revokeUserSessions(userId, now);
      await store.prisma.userGoogleAuth.deleteMany({
        where: { OR: [{ userId }, { user: { deletedAt: { not: null } } }] }
      });
      await store.prisma.student.updateMany({
        where: { userId },
        data: { userId: null }
      });
      await store.prisma.faculty.updateMany({
        where: { userId },
        data: { userId: null }
      });
      await store.prisma.user.update({
        where: { id: userId },
        data: {
          username: tombstone,
          usernameNormalized: tombstone,
          displayName: "Deleted account",
          email: null,
          emailNormalized: null,
          status: "DISABLED",
          mustChangePassword: true,
          passwordHash: "deleted-account",
          authorizationVersion: { increment: 1 },
          deletedAt: asDate(now),
          updatedAt: asDate(now)
        }
      });
      return true;
    });
  }

  async createSystemReport(data) {
    const report = await this.prisma.systemReport.create({
      data: {
        category: data.category || "BUG",
        description: data.description,
        screenshotData: data.screenshotData || null,
        status: "OPEN",
        pageUrl: data.pageUrl || "/",
        browserInfo: data.browserInfo || null,
        errorCode: data.errorCode || null,
        userId: data.userId || null,
        userRole: data.userRole || null
      }
    });
    return report;
  }

  async listSystemReports({ status, limit = 100 } = {}) {
    const where = status && status !== "ALL" ? { status } : {};
    const reports = await this.prisma.systemReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: { select: { id: true, username: true, displayName: true, email: true } },
        resolvedBy: { select: { id: true, username: true, displayName: true } }
      }
    });
    return reports;
  }

  async updateSystemReportStatus(id, { status, adminNotes, resolvedByUserId }) {
    const updateData = {};
    if (status) updateData.status = status;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
    if (resolvedByUserId) updateData.resolvedByUserId = resolvedByUserId;
    updateData.updatedAt = new Date();

    const report = await this.prisma.systemReport.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, username: true, displayName: true, email: true } },
        resolvedBy: { select: { id: true, username: true, displayName: true } }
      }
    });
    return report;
  }
}

export function isUniqueConstraint(error) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
