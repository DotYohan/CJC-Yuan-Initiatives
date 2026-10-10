import { randomUUID as newId } from "node:crypto";
import { hashPassword, normalizeIdentifier } from "./security.mjs";

const fullName = (person) =>
  [person?.firstName, person?.middleName, person?.lastName, person?.suffix].filter(Boolean).join(" ");

export class ClubStore {
  constructor(prisma, config = {}) {
    this.prisma = prisma;
    this.config = { scrypt: { N: 16384, r: 8, p: 1, keyLength: 32 }, ...config };
  }

  // ─────────────────────────────────────────────────────────────
  // 1. HELPERS & SYNC
  // ─────────────────────────────────────────────────────────────

  async syncClubExpiration(club, now = new Date()) {
    if (!club) return null;
    const isExpired = club.status === "ACTIVE" && new Date(club.effectivityEndDate) < now;
    if (isExpired) {
      await this.prisma.club.update({
        where: { id: club.id },
        data: { status: "EXPIRED" }
      });
      return { ...club, status: "EXPIRED" };
    }
    return club;
  }

  // ─────────────────────────────────────────────────────────────
  // 2. SSC OPERATIONS (Student Services Center)
  // ─────────────────────────────────────────────────────────────

  async createClub(sscUserId, input) {
    const {
      name,
      description,
      category = "ACADEMIC",
      adviser,
      collegeId,
      departmentId,
      username,
      password,
      effectivityStartDate,
      effectivityEndDate
    } = input;

    if (!name || !name.trim()) throw new Error("CLUB_NAME_REQUIRED");
    if (!adviser || !adviser.trim()) throw new Error("CLUB_ADVISER_REQUIRED");
    if (!username || !username.trim()) throw new Error("CLUB_USERNAME_REQUIRED");
    if (!password || !password.trim()) throw new Error("CLUB_PASSWORD_REQUIRED");
    if (!effectivityStartDate || !effectivityEndDate) throw new Error("EFFECTIVITY_DATES_REQUIRED");

    const startDate = new Date(effectivityStartDate);
    const endDate = new Date(effectivityEndDate);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new Error("INVALID_EFFECTIVITY_DATES");
    }
    if (startDate >= endDate) {
      throw new Error("START_DATE_MUST_PRECEDE_END_DATE");
    }

    const validCategories = ["ACADEMIC", "NON_ACADEMIC"];
    const clubCategory = validCategories.includes(category) ? category : "ACADEMIC";

    const usernameNormalized = normalizeIdentifier(username);
    const existingUser = await this.prisma.user.findUnique({ where: { usernameNormalized } });
    if (existingUser) throw new Error("CLUB_USERNAME_TAKEN");

    const existingName = await this.prisma.club.findUnique({ where: { name: name.trim() } });
    if (existingName) throw new Error("CLUB_NAME_TAKEN");

    const code =
      input.code?.trim().toUpperCase() ||
      name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 30);

    const clubRole = await this.prisma.role.findUniqueOrThrow({ where: { slug: "club" } });
    const passwordHash = await hashPassword(password, this.config.scrypt);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          id: newId(),
          username: username.trim(),
          usernameNormalized,
          displayName: name.trim(),
          passwordHash,
          status: "ACTIVE",
          mustChangePassword: false,
          userRoles: {
            create: {
              roleId: clubRole.id,
              isPrimary: true,
              assignedByUserId: sscUserId
            }
          }
        }
      });

      const now = new Date();
      const status = now > endDate ? "EXPIRED" : "ACTIVE";

      const club = await tx.club.create({
        data: {
          id: newId(),
          code,
          name: name.trim(),
          description: description?.trim() || null,
          category: clubCategory,
          adviser: adviser.trim(),
          collegeId: collegeId || null,
          departmentId: departmentId || null,
          userId: user.id,
          effectivityStartDate: startDate,
          effectivityEndDate: endDate,
          status,
          createdByUserId: sscUserId
        },
        include: {
          college: { select: { id: true, name: true, code: true } },
          department: { select: { id: true, name: true, code: true } }
        }
      });

      return { club, account: { id: user.id, username: user.username, displayName: user.displayName } };
    });
  }

  async listClubsForSsc(filter = "ALL") {
    const now = new Date();

    // Sync any expired active clubs
    await this.prisma.club.updateMany({
      where: {
        status: "ACTIVE",
        effectivityEndDate: { lt: now }
      },
      data: { status: "EXPIRED" }
    });

    const where = {};
    if (filter === "ACTIVE") where.status = "ACTIVE";
    else if (filter === "INACTIVE") where.status = "INACTIVE";
    else if (filter === "EXPIRED") where.status = "EXPIRED";

    const [clubs, metricsRaw] = await Promise.all([
      this.prisma.club.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        include: {
          college: { select: { id: true, name: true, code: true } },
          department: { select: { id: true, name: true, code: true } },
          user: { select: { id: true, username: true, status: true } },
          _count: {
            select: {
              members: true,
              officers: true,
              announcements: true,
              documents: true
            }
          }
        }
      }),
      this.prisma.club.groupBy({
        by: ["status"],
        _count: { id: true }
      })
    ]);

    const metrics = {
      total: 0,
      active: 0,
      inactive: 0,
      expired: 0
    };
    for (const group of metricsRaw) {
      const count = group._count.id;
      metrics.total += count;
      if (group.status === "ACTIVE") metrics.active = count;
      if (group.status === "INACTIVE") metrics.inactive = count;
      if (group.status === "EXPIRED") metrics.expired = count;
    }

    return {
      clubs: clubs.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        description: c.description,
        category: c.category,
        adviser: c.adviser,
        status: c.status,
        effectivityStartDate: c.effectivityStartDate,
        effectivityEndDate: c.effectivityEndDate,
        college: c.college,
        department: c.department,
        accountUsername: c.user?.username,
        memberCount: c._count.members,
        officerCount: c._count.officers,
        announcementCount: c._count.announcements,
        documentCount: c._count.documents,
        createdAt: c.createdAt
      })),
      metrics
    };
  }

  async updateClubStatus(sscUserId, clubId, status) {
    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      throw new Error("INVALID_STATUS");
    }
    const club = await this.prisma.club.findUnique({ where: { id: clubId } });
    if (!club) throw new Error("CLUB_NOT_FOUND");

    const now = new Date();
    let nextStatus = status;
    if (status === "ACTIVE" && new Date(club.effectivityEndDate) < now) {
      nextStatus = "EXPIRED";
    }

    return this.prisma.club.update({
      where: { id: clubId },
      data: { status: nextStatus }
    });
  }

  async updateClubEffectivity(sscUserId, clubId, { effectivityStartDate, effectivityEndDate }) {
    const startDate = new Date(effectivityStartDate);
    const endDate = new Date(effectivityEndDate);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new Error("INVALID_EFFECTIVITY_DATES");
    }
    if (startDate >= endDate) {
      throw new Error("START_DATE_MUST_PRECEDE_END_DATE");
    }

    const now = new Date();
    const status = now > endDate ? "EXPIRED" : "ACTIVE";

    return this.prisma.club.update({
      where: { id: clubId },
      data: {
        effectivityStartDate: startDate,
        effectivityEndDate: endDate,
        status
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 3. CLUB ACCOUNT OPERATIONS (Area of Responsibility: AOR)
  // ─────────────────────────────────────────────────────────────

  async getClubByUserId(clubUserId) {
    const club = await this.prisma.club.findUnique({
      where: { userId: clubUserId },
      include: {
        college: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } }
      }
    });
    if (!club) throw new Error("CLUB_ACCOUNT_NOT_FOUND");
    return this.syncClubExpiration(club);
  }

  async getClubDashboard(clubUserId) {
    const club = await this.getClubByUserId(clubUserId);
    const [officers, members, clearancesSummary, announcements, documents] =
      await Promise.all([
        this.prisma.clubOfficer.findMany({
          where: { clubId: club.id },
          include: {
            student: {
              select: {
                id: true,
                studentNumber: true,
                firstName: true,
                middleName: true,
                lastName: true,
                suffix: true,
                program: { select: { name: true, code: true } },
                currentYearLevel: true
              }
            }
          },
          orderBy: { createdAt: "asc" }
        }),
        this.listMembers(clubUserId),
        this.prisma.clubClearance.groupBy({
          by: ["status"],
          where: { clubId: club.id },
          _count: { id: true }
        }),
        this.listAnnouncements(clubUserId),
        this.listDocuments(clubUserId)
      ]);

    const clearanceMetrics = { total: members.length, cleared: 0, pending: 0, notCleared: 0 };
    for (const group of clearancesSummary) {
      if (group.status === "CLEARED") clearanceMetrics.cleared = group._count.id;
      if (group.status === "PENDING") clearanceMetrics.pending = group._count.id;
      if (group.status === "NOT_CLEARED") clearanceMetrics.notCleared = group._count.id;
    }

    const mappedOfficers = officers.map((o) => {
      const officerFullName = fullName(o.student);
      return {
        id: o.id,
        studentId: o.studentId,
        studentNumber: o.student.studentNumber,
        studentName: officerFullName,
        name: officerFullName,
        fullName: officerFullName,
        program: o.student.program?.name,
        currentYearLevel: o.student.currentYearLevel,
        position: o.position,
        canClearClearance: o.canClearClearance,
        createdAt: o.createdAt,
        student: {
          id: o.student.id,
          studentIdNumber: o.student.studentNumber,
          studentNumber: o.student.studentNumber,
          fullName: officerFullName,
          name: officerFullName,
          program: o.student.program,
          yearLevel: o.student.currentYearLevel,
          currentYearLevel: o.student.currentYearLevel
        }
      };
    });

    return {
      club,
      metrics: {
        memberCount: members.length,
        officerCount: mappedOfficers.length,
        announcementCount: announcements.length,
        documentCount: documents.length,
        clearances: clearanceMetrics
      },
      officers: mappedOfficers,
      members,
      announcements,
      documents,
      clearanceSummary: {
        totalMembers: members.length,
        clearedMembers: clearanceMetrics.cleared,
        pendingMembers: clearanceMetrics.pending
      }
    };
  }

  // Exact Student ID lookup for officer appointment (Privacy & AOR enforced)
  async validateStudentForOfficer(clubUserId, studentNumber) {
    await this.getClubByUserId(clubUserId); // verifies club account

    if (!studentNumber || !studentNumber.trim()) throw new Error("STUDENT_ID_REQUIRED");
    const normalized = normalizeIdentifier(studentNumber.trim());

    const student = await this.prisma.student.findFirst({
      where: {
        OR: [
          { studentNumberNormalized: normalized },
          { studentNumber: studentNumber.trim() }
        ]
      },
      select: {
        id: true,
        studentNumber: true,
        firstName: true,
        middleName: true,
        lastName: true,
        suffix: true,
        currentYearLevel: true,
        program: { select: { name: true, code: true } }
      }
    });

    if (!student) throw new Error("STUDENT_NOT_FOUND");

    return {
      id: student.id,
      studentNumber: student.studentNumber,
      studentName: fullName(student),
      program: student.program?.name || "No program",
      currentYearLevel: student.currentYearLevel
    };
  }

  async assignOfficer(clubUserId, { studentId, studentIdNumber, studentNumber, position, canClearClearance = false }) {
    const club = await this.getClubByUserId(clubUserId);
    const identifier = studentId || studentIdNumber || studentNumber;
    if (!identifier || (typeof identifier === "string" && !identifier.trim())) {
      throw new Error("STUDENT_ID_REQUIRED");
    }
    if (!position || !position.trim()) throw new Error("OFFICER_POSITION_REQUIRED");

    const lookup = String(identifier).trim();
    const normalized = normalizeIdentifier(lookup);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lookup);

    const student = await this.prisma.student.findFirst({
      where: {
        OR: [
          ...(isUuid ? [{ id: lookup }] : []),
          { studentNumberNormalized: normalized },
          { studentNumber: lookup }
        ]
      }
    });
    if (!student) throw new Error("STUDENT_NOT_FOUND");

    return this.prisma.$transaction(async (tx) => {
      // Ensure student is also a club member
      await tx.clubMember.upsert({
        where: { clubId_studentId: { clubId: club.id, studentId: student.id } },
        update: { status: "ACTIVE" },
        create: {
          id: newId(),
          clubId: club.id,
          studentId: student.id,
          status: "ACTIVE"
        }
      });

      // Ensure clearance row exists
      await tx.clubClearance.upsert({
        where: { clubId_studentId: { clubId: club.id, studentId: student.id } },
        update: {},
        create: {
          id: newId(),
          clubId: club.id,
          studentId: student.id,
          status: "PENDING"
        }
      });

      const officer = await tx.clubOfficer.upsert({
        where: { clubId_studentId: { clubId: club.id, studentId: student.id } },
        update: {
          position: position.trim(),
          canClearClearance: Boolean(canClearClearance),
          assignedByUserId: clubUserId
        },
        create: {
          id: newId(),
          clubId: club.id,
          studentId: student.id,
          position: position.trim(),
          canClearClearance: Boolean(canClearClearance),
          assignedByUserId: clubUserId
        },
        include: {
          student: {
            select: {
              studentNumber: true,
              firstName: true,
              middleName: true,
              lastName: true,
              suffix: true,
              program: { select: { name: true } },
              currentYearLevel: true
            }
          }
        }
      });

      return {
        id: officer.id,
        studentId: officer.studentId,
        studentNumber: officer.student.studentNumber,
        studentName: fullName(officer.student),
        program: officer.student.program?.name,
        currentYearLevel: officer.student.currentYearLevel,
        position: officer.position,
        canClearClearance: officer.canClearClearance
      };
    });
  }

  async updateOfficer(clubUserId, officerId, { position, canClearClearance }) {
    const club = await this.getClubByUserId(clubUserId);
    const existing = await this.prisma.clubOfficer.findUnique({ where: { id: officerId } });
    if (!existing || existing.clubId !== club.id) throw new Error("OFFICER_NOT_FOUND");

    const data = {};
    if (position !== undefined) {
      if (!position.trim()) throw new Error("OFFICER_POSITION_REQUIRED");
      data.position = position.trim();
    }
    if (canClearClearance !== undefined) {
      data.canClearClearance = Boolean(canClearClearance);
    }

    return this.prisma.clubOfficer.update({
      where: { id: officerId },
      data
    });
  }

  async removeOfficer(clubUserId, officerId) {
    const club = await this.getClubByUserId(clubUserId);
    const existing = await this.prisma.clubOfficer.findUnique({ where: { id: officerId } });
    if (!existing || existing.clubId !== club.id) throw new Error("OFFICER_NOT_FOUND");

    await this.prisma.clubOfficer.delete({ where: { id: officerId } });
    return true;
  }

  async listOfficers(clubUserId) {
    const club = await this.getClubByUserId(clubUserId);
    const officers = await this.prisma.clubOfficer.findMany({
      where: { clubId: club.id },
      include: {
        student: {
          select: {
            id: true,
            studentNumber: true,
            firstName: true,
            middleName: true,
            lastName: true,
            suffix: true,
            program: { select: { name: true, code: true } },
            currentYearLevel: true
          }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    return officers.map((o) => {
      const officerFullName = fullName(o.student);
      return {
        id: o.id,
        studentId: o.studentId,
        studentNumber: o.student.studentNumber,
        studentName: officerFullName,
        name: officerFullName,
        fullName: officerFullName,
        program: o.student.program?.name,
        currentYearLevel: o.student.currentYearLevel,
        position: o.position,
        canClearClearance: o.canClearClearance,
        createdAt: o.createdAt,
        student: {
          id: o.student.id,
          studentIdNumber: o.student.studentNumber,
          studentNumber: o.student.studentNumber,
          fullName: officerFullName,
          name: officerFullName,
          program: o.student.program,
          yearLevel: o.student.currentYearLevel,
          currentYearLevel: o.student.currentYearLevel
        }
      };
    });
  }

  async listMembers(clubUserId) {
    const club = await this.getClubByUserId(clubUserId);
    const members = await this.prisma.clubMember.findMany({
      where: { clubId: club.id },
      include: {
        student: {
          select: {
            id: true,
            studentNumber: true,
            firstName: true,
            middleName: true,
            lastName: true,
            suffix: true,
            currentYearLevel: true,
            program: { select: { name: true, code: true } },
            clubClearances: {
              where: { clubId: club.id },
              select: {
                status: true,
                remarks: true,
                clearedAt: true,
                clearedBy: { select: { displayName: true, username: true } }
              }
            },
            clubOfficerRoles: {
              where: { clubId: club.id },
              select: { position: true, canClearClearance: true }
            }
          }
        }
      },
      orderBy: { joinedAt: "desc" }
    });

    return members.map((m) => {
      const clearance = m.student.clubClearances[0];
      const officer = m.student.clubOfficerRoles[0];
      const memberFullName = fullName(m.student);
      const clearedByName = clearance?.clearedBy?.displayName || null;
      return {
        id: m.id,
        studentId: m.student.id,
        studentNumber: m.student.studentNumber,
        studentName: memberFullName,
        name: memberFullName,
        fullName: memberFullName,
        program: m.student.program?.name,
        currentYearLevel: m.student.currentYearLevel,
        joinedAt: m.joinedAt,
        status: m.status,
        role: officer ? "OFFICER" : "MEMBER",
        isOfficer: Boolean(officer),
        position: officer?.position || null,
        canClearClearance: officer?.canClearClearance || false,
        clearanceStatus: clearance?.status || "PENDING",
        clearanceRemarks: clearance?.remarks || null,
        clearedAt: clearance?.clearedAt || null,
        clearedBy: clearedByName,
        student: {
          id: m.student.id,
          studentIdNumber: m.student.studentNumber,
          studentNumber: m.student.studentNumber,
          fullName: memberFullName,
          name: memberFullName,
          program: m.student.program,
          yearLevel: m.student.currentYearLevel,
          currentYearLevel: m.student.currentYearLevel
        },
        clearance: {
          status: clearance?.status || "PENDING",
          remarks: clearance?.remarks || null,
          clearedAt: clearance?.clearedAt || null,
          clearedByOfficer: clearedByName ? { fullName: clearedByName, position: "Clearance Officer" } : null
        }
      };
    });
  }

  // Announcements
  async createAnnouncement(clubUserId, { title, content }) {
    const club = await this.getClubByUserId(clubUserId);
    if (!title || !title.trim()) throw new Error("ANNOUNCEMENT_TITLE_REQUIRED");
    if (!content || !content.trim()) throw new Error("ANNOUNCEMENT_CONTENT_REQUIRED");

    return this.prisma.clubAnnouncement.create({
      data: {
        id: newId(),
        clubId: club.id,
        title: title.trim(),
        content: content.trim(),
        postedByUserId: clubUserId
      }
    });
  }

  async listAnnouncements(clubUserId) {
    const club = await this.getClubByUserId(clubUserId);
    return this.prisma.clubAnnouncement.findMany({
      where: { clubId: club.id },
      orderBy: { createdAt: "desc" },
      include: {
        postedBy: { select: { displayName: true, username: true } }
      }
    });
  }

  async deleteAnnouncement(clubUserId, id) {
    const club = await this.getClubByUserId(clubUserId);
    const item = await this.prisma.clubAnnouncement.findUnique({ where: { id } });
    if (!item || item.clubId !== club.id) throw new Error("ANNOUNCEMENT_NOT_FOUND");
    await this.prisma.clubAnnouncement.delete({ where: { id } });
    return true;
  }

  // Classified Documents
  async createDocument(clubUserId, { title, category = "OTHER", description, fileUrl, fileName }) {
    const club = await this.getClubByUserId(clubUserId);
    if (!title || !title.trim()) throw new Error("DOCUMENT_TITLE_REQUIRED");

    const validCategories = [
      "RESOLUTION",
      "MEMORANDUM",
      "CONSTITUTION_BYLAWS",
      "FINANCIAL_REPORT",
      "ACTIVITY_PROPOSAL",
      "OTHER"
    ];
    const docCategory = validCategories.includes(category) ? category : "OTHER";

    return this.prisma.clubDocument.create({
      data: {
        id: newId(),
        clubId: club.id,
        title: title.trim(),
        category: docCategory,
        description: description?.trim() || null,
        fileUrl: fileUrl?.trim() || null,
        fileName: fileName?.trim() || null,
        uploadedByUserId: clubUserId
      }
    });
  }

  async listDocuments(clubUserId) {
    const club = await this.getClubByUserId(clubUserId);
    return this.prisma.clubDocument.findMany({
      where: { clubId: club.id },
      orderBy: [{ category: "asc" }, { createdAt: "desc" }],
      include: {
        uploadedBy: { select: { displayName: true, username: true } }
      }
    });
  }

  async deleteDocument(clubUserId, id) {
    const club = await this.getClubByUserId(clubUserId);
    const item = await this.prisma.clubDocument.findUnique({ where: { id } });
    if (!item || item.clubId !== club.id) throw new Error("DOCUMENT_NOT_FOUND");
    await this.prisma.clubDocument.delete({ where: { id } });
    return true;
  }

  // ─────────────────────────────────────────────────────────────
  // 4. STUDENT CLUB OPERATIONS
  // ─────────────────────────────────────────────────────────────

  async getStudentByUserId(studentUserId) {
    const student = await this.prisma.student.findUnique({
      where: { userId: studentUserId }
    });
    if (!student) throw new Error("STUDENT_PROFILE_NOT_FOUND");
    return student;
  }

  async listAvailableClubs(studentUserId) {
    const student = await this.getStudentByUserId(studentUserId);
    const now = new Date();

    // Query active clubs within effectivity
    const clubs = await this.prisma.club.findMany({
      where: {
        status: "ACTIVE",
        effectivityStartDate: { lte: now },
        effectivityEndDate: { gte: now },
        members: {
          none: {
            studentId: student.id,
            status: "ACTIVE"
          }
        }
      },
      include: {
        college: { select: { name: true, code: true } },
        department: { select: { name: true, code: true } },
        _count: { select: { members: true, officers: true } }
      },
      orderBy: [{ name: "asc" }]
    });

    return clubs.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      description: c.description,
      category: c.category,
      adviser: c.adviser,
      college: c.college,
      department: c.department,
      memberCount: c._count.members,
      officerCount: c._count.officers,
      effectivityStartDate: c.effectivityStartDate,
      effectivityEndDate: c.effectivityEndDate
    }));
  }

  async listMyClubs(studentUserId) {
    const student = await this.getStudentByUserId(studentUserId);
    const now = new Date();

    const memberships = await this.prisma.clubMember.findMany({
      where: { studentId: student.id },
      include: {
        club: {
          include: {
            college: { select: { name: true, code: true } },
            department: { select: { name: true, code: true } },
            _count: { select: { members: true, officers: true } }
          }
        }
      },
      orderBy: { joinedAt: "desc" }
    });

    const result = [];
    for (const m of memberships) {
      const club = await this.syncClubExpiration(m.club, now);
      const isExpired = club.status === "EXPIRED" || new Date(club.effectivityEndDate) < now;

      // Clearance status
      const clearance = await this.prisma.clubClearance.findUnique({
        where: { clubId_studentId: { clubId: club.id, studentId: student.id } }
      });
      const clearanceStatus = clearance?.status || "PENDING";
      const isSettled = clearanceStatus === "CLEARED";

      // If expired AND settled, club interaction is disabled
      const isInteractionDisabled = isExpired && isSettled;

      // Check officer status
      const officer = await this.prisma.clubOfficer.findUnique({
        where: { clubId_studentId: { clubId: club.id, studentId: student.id } }
      });

      result.push({
        membershipId: m.id,
        clubId: club.id,
        clubName: club.name,
        clubCode: club.code,
        category: club.category,
        adviser: club.adviser,
        description: club.description,
        status: isExpired ? "EXPIRED" : club.status,
        joinedAt: m.joinedAt,
        clearanceStatus,
        clearanceRemarks: clearance?.remarks || null,
        isOfficer: Boolean(officer),
        officerPosition: officer?.position || null,
        canClearClearance: officer?.canClearClearance || false,
        isExpired,
        isSettled,
        isInteractionDisabled,
        hasPendingObligation: isExpired && !isSettled
      });
    }

    return result;
  }

  async joinClub(studentUserId, clubId) {
    const student = await this.getStudentByUserId(studentUserId);
    const now = new Date();

    const club = await this.prisma.club.findUnique({ where: { id: clubId } });
    if (!club) throw new Error("CLUB_NOT_FOUND");
    await this.syncClubExpiration(club, now);

    if (club.status !== "ACTIVE" || new Date(club.effectivityEndDate) < now || new Date(club.effectivityStartDate) > now) {
      throw new Error("CLUB_NOT_AVAILABLE");
    }

    const existingMembership = await this.prisma.clubMember.findUnique({
      where: { clubId_studentId: { clubId: club.id, studentId: student.id } }
    });
    if (existingMembership && existingMembership.status === "ACTIVE") {
      throw new Error("ALREADY_CLUB_MEMBER");
    }

    // Maximum 3 active clubs rule
    const activeClubsCount = await this.prisma.clubMember.count({
      where: {
        studentId: student.id,
        status: "ACTIVE",
        club: {
          status: "ACTIVE",
          effectivityEndDate: { gte: now }
        }
      }
    });

    if (activeClubsCount >= 3) {
      throw new Error("MAXIMUM_ACTIVE_CLUBS_REACHED");
    }

    return this.prisma.$transaction(async (tx) => {
      const membership = await tx.clubMember.upsert({
        where: { clubId_studentId: { clubId: club.id, studentId: student.id } },
        update: { status: "ACTIVE", joinedAt: now },
        create: {
          id: newId(),
          clubId: club.id,
          studentId: student.id,
          status: "ACTIVE",
          joinedAt: now
        }
      });

      await tx.clubClearance.upsert({
        where: { clubId_studentId: { clubId: club.id, studentId: student.id } },
        update: { status: "PENDING" },
        create: {
          id: newId(),
          clubId: club.id,
          studentId: student.id,
          status: "PENDING"
        }
      });

      return membership;
    });
  }

  async getStudentClubPortal(studentUserId, clubId) {
    const student = await this.getStudentByUserId(studentUserId);
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      include: {
        college: { select: { name: true, code: true } },
        department: { select: { name: true, code: true } }
      }
    });
    if (!club) throw new Error("CLUB_NOT_FOUND");

    const membership = await this.prisma.clubMember.findUnique({
      where: { clubId_studentId: { clubId: club.id, studentId: student.id } }
    });
    if (!membership || membership.status !== "ACTIVE") {
      throw new Error("NOT_A_CLUB_MEMBER");
    }

    const now = new Date();
    const isExpired = club.status === "EXPIRED" || new Date(club.effectivityEndDate) < now;

    // Check my clearance status
    const myClearance = await this.prisma.clubClearance.findUnique({
      where: { clubId_studentId: { clubId: club.id, studentId: student.id } },
      include: {
        clearedBy: {
          select: { displayName: true }
        }
      }
    });

    // Check my officer status in this club
    const officerRole = await this.prisma.clubOfficer.findUnique({
      where: { clubId_studentId: { clubId: club.id, studentId: student.id } }
    });

    // Determine Dashboard Type
    let dashboardType = "NORMAL_MEMBER";
    if (officerRole?.canClearClearance) {
      dashboardType = "OFFICER_WITH_CLEARANCE";
    } else if (officerRole) {
      dashboardType = "OFFICER_WITHOUT_CLEARANCE";
    }

    // Shared data: officers, announcements, documents
    const [officers, announcements, documents] = await Promise.all([
      this.prisma.clubOfficer.findMany({
        where: { clubId: club.id },
        include: {
          student: {
            select: {
              id: true,
              studentNumber: true,
              firstName: true,
              middleName: true,
              lastName: true,
              suffix: true,
              currentYearLevel: true,
              program: { select: { name: true, code: true } }
            }
          }
        },
        orderBy: { createdAt: "asc" }
      }),
      this.prisma.clubAnnouncement.findMany({
        where: { clubId: club.id },
        orderBy: { createdAt: "desc" },
        include: { postedBy: { select: { displayName: true } } }
      }),
      this.prisma.clubDocument.findMany({
        where: { clubId: club.id },
        orderBy: [{ category: "asc" }, { createdAt: "desc" }],
        include: { uploadedBy: { select: { displayName: true } } }
      })
    ]);

    const basePayload = {
      dashboardType,
      isExpired,
      club: {
        id: club.id,
        code: club.code,
        name: club.name,
        description: club.description,
        category: club.category,
        adviser: club.adviser,
        status: isExpired ? "EXPIRED" : club.status,
        effectivityStartDate: club.effectivityStartDate,
        effectivityEndDate: club.effectivityEndDate,
        college: club.college,
        department: club.department
      },
      officers: officers.map((o) => {
        const officerFullName = fullName(o.student);
        return {
          id: o.id,
          studentId: o.studentId,
          studentNumber: o.student?.studentNumber,
          studentName: officerFullName,
          name: officerFullName,
          fullName: officerFullName,
          position: o.position,
          program: o.student?.program?.name,
          currentYearLevel: o.student?.currentYearLevel,
          canClearClearance: o.canClearClearance,
          student: {
            id: o.student?.id,
            studentIdNumber: o.student?.studentNumber,
            studentNumber: o.student?.studentNumber,
            fullName: officerFullName,
            name: officerFullName,
            program: o.student?.program,
            yearLevel: o.student?.currentYearLevel,
            currentYearLevel: o.student?.currentYearLevel
          }
        };
      }),
      announcements: announcements.map((a) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        postedBy: a.postedBy?.displayName,
        createdAt: a.createdAt
      })),
      documents: documents.map((d) => ({
        id: d.id,
        title: d.title,
        category: d.category,
        description: d.description,
        fileUrl: d.fileUrl,
        fileName: d.fileName,
        uploadedBy: d.uploadedBy?.displayName,
        createdAt: d.createdAt
      })),
      myClearance: {
        status: myClearance?.status || "PENDING",
        remarks: myClearance?.remarks || null,
        clearedAt: myClearance?.clearedAt || null,
        clearedByOfficer: myClearance?.clearedBy?.displayName
          ? { fullName: myClearance.clearedBy.displayName, position: "Clearance Officer" }
          : null
      }
    };

    // If Officer WITH Clearance Authority: include member list for clearance evaluation
    if (dashboardType === "OFFICER_WITH_CLEARANCE") {
      const members = await this.prisma.clubMember.findMany({
        where: { clubId: club.id },
        include: {
          student: {
            select: {
              id: true,
              studentNumber: true,
              firstName: true,
              middleName: true,
              lastName: true,
              suffix: true,
              currentYearLevel: true,
              program: { select: { name: true, code: true } },
              clubClearances: {
                where: { clubId: club.id },
                select: {
                  status: true,
                  remarks: true,
                  clearedAt: true,
                  clearedBy: { select: { displayName: true, username: true } }
                }
              },
              clubOfficerRoles: {
                where: { clubId: club.id },
                select: { position: true, canClearClearance: true }
              }
            }
          }
        },
        orderBy: { joinedAt: "asc" }
      });

      basePayload.members = members.map((m) => {
        const clr = m.student.clubClearances[0];
        const off = m.student.clubOfficerRoles[0];
        const memberFullName = fullName(m.student);
        const clearedByName = clr?.clearedBy?.displayName || null;
        return {
          id: m.id,
          studentId: m.student.id,
          studentNumber: m.student.studentNumber,
          studentName: memberFullName,
          name: memberFullName,
          fullName: memberFullName,
          program: m.student.program?.name,
          currentYearLevel: m.student.currentYearLevel,
          joinedAt: m.joinedAt,
          role: off ? "OFFICER" : "MEMBER",
          isOfficer: Boolean(off),
          position: off?.position || null,
          canClearClearance: off?.canClearClearance || false,
          clearanceStatus: clr?.status || "PENDING",
          clearanceRemarks: clr?.remarks || null,
          clearedAt: clr?.clearedAt || null,
          clearedBy: clearedByName,
          student: {
            id: m.student.id,
            studentIdNumber: m.student.studentNumber,
            studentNumber: m.student.studentNumber,
            fullName: memberFullName,
            name: memberFullName,
            program: m.student.program,
            yearLevel: m.student.currentYearLevel,
            currentYearLevel: m.student.currentYearLevel
          },
          clearance: {
            status: clr?.status || "PENDING",
            remarks: clr?.remarks || null,
            clearedAt: clr?.clearedAt || null,
            clearedByOfficer: clearedByName ? { fullName: clearedByName, position: "Clearance Officer" } : null
          }
        };
      });
    }

    return basePayload;
  }

  // Clearance Evaluation (Authority & Area of Responsibility: AOR)
  async evaluateClearance(studentOfficerUserId, clubId, { targetStudentId, status, remarks }) {
    const officerStudent = await this.getStudentByUserId(studentOfficerUserId);

    // Verify evaluating student is an officer with clearance authority for this specific club
    const officerRole = await this.prisma.clubOfficer.findUnique({
      where: { clubId_studentId: { clubId, studentId: officerStudent.id } }
    });
    if (!officerRole || !officerRole.canClearClearance) {
      throw new Error("CLEARANCE_AUTHORITY_REQUIRED");
    }

    // Verify target student is a member of this club
    const membership = await this.prisma.clubMember.findUnique({
      where: { clubId_studentId: { clubId, studentId: targetStudentId } }
    });
    if (!membership || membership.status !== "ACTIVE") {
      throw new Error("TARGET_STUDENT_NOT_IN_CLUB");
    }

    const validStatuses = ["CLEARED", "PENDING", "NOT_CLEARED"];
    if (!validStatuses.includes(status)) {
      throw new Error("INVALID_CLEARANCE_STATUS");
    }

    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const clearance = await tx.clubClearance.upsert({
        where: { clubId_studentId: { clubId, studentId: targetStudentId } },
        update: {
          status,
          remarks: remarks?.trim() || null,
          clearedByUserId: studentOfficerUserId,
          clearedAt: status === "CLEARED" ? now : null
        },
        create: {
          id: newId(),
          clubId,
          studentId: targetStudentId,
          status,
          remarks: remarks?.trim() || null,
          clearedByUserId: studentOfficerUserId,
          clearedAt: status === "CLEARED" ? now : null
        }
      });

      // Write immutable audit trail
      await tx.clubClearanceAudit.create({
        data: {
          id: newId(),
          clubId,
          studentId: targetStudentId,
          action: status,
          remarks: remarks?.trim() || null,
          performedByUserId: studentOfficerUserId,
          createdAt: now
        }
      });

      // Synchronize with active institutional StudentClearance and ClearanceItem if present
      const club = await tx.club.findUnique({
        where: { id: clubId },
        select: { id: true, code: true, name: true }
      });

      if (club) {
        const studentClearances = await tx.studentClearance.findMany({
          where: {
            studentId: targetStudentId,
            cycle: { status: "OPEN" }
          },
          include: {
            cycle: {
              include: {
                requirements: true
              }
            },
            items: true
          }
        });

        for (const sc of studentClearances) {
          let req = sc.cycle.requirements.find(
            (r) => r.code === `CLUB-${club.code}` || r.code === club.code
          );
          if (!req) {
            req = sc.cycle.requirements.find(
              (r) => r.officeType === "OTHER" && r.code.toUpperCase().includes("CLUB")
            );
          }

          if (req) {
            const itemStatus = status === "CLEARED" ? "APPROVED" : status === "NOT_CLEARED" ? "BLOCKED" : "PENDING";
            await tx.clearanceItem.upsert({
              where: {
                studentClearanceId_requirementId: {
                  studentClearanceId: sc.id,
                  requirementId: req.id
                }
              },
              update: {
                status: itemStatus,
                remarks: remarks?.trim() || (status === "CLEARED" ? "Cleared by Club Officer" : null),
                actedByUserId: studentOfficerUserId,
                actedAt: now
              },
              create: {
                id: newId(),
                studentClearanceId: sc.id,
                requirementId: req.id,
                status: itemStatus,
                remarks: remarks?.trim() || (status === "CLEARED" ? "Cleared by Club Officer" : null),
                actedByUserId: studentOfficerUserId,
                actedAt: now
              }
            });

            const updatedItems = await tx.clearanceItem.findMany({
              where: { studentClearanceId: sc.id }
            });
            const allRequired = sc.cycle.requirements.filter((r) => r.isRequired);
            const hasBlocked = updatedItems.some((i) => i.status === "BLOCKED");
            const allCleared = allRequired.every((r) => {
              const it = updatedItems.find((i) => i.requirementId === r.id);
              return it && (it.status === "APPROVED" || it.status === "WAIVED");
            });

            await tx.studentClearance.update({
              where: { id: sc.id },
              data: {
                status: hasBlocked ? "BLOCKED" : allCleared ? "CLEARED" : "IN_PROGRESS",
                completedAt: allCleared ? now : null
              }
            });
          }
        }
      }

      return clearance;
    });
  }

  async listClubClearanceHistory(studentOfficerUserId, clubId) {
    const officerStudent = await this.getStudentByUserId(studentOfficerUserId);
    const officerRole = await this.prisma.clubOfficer.findUnique({
      where: { clubId_studentId: { clubId, studentId: officerStudent.id } }
    });
    if (!officerRole || !officerRole.canClearClearance) {
      throw new Error("CLEARANCE_AUTHORITY_REQUIRED");
    }

    const audits = await this.prisma.clubClearanceAudit.findMany({
      where: { clubId },
      orderBy: { createdAt: "desc" },
      include: {
        student: {
          select: {
            studentNumber: true,
            firstName: true,
            middleName: true,
            lastName: true,
            suffix: true
          }
        },
        performedBy: {
          select: {
            displayName: true,
            username: true
          }
        }
      }
    });

    return audits.map((a) => ({
      id: a.id,
      studentId: a.studentId,
      studentNumber: a.student.studentNumber,
      studentName: fullName(a.student),
      action: a.action,
      remarks: a.remarks,
      performedByName: a.performedBy?.displayName,
      performedByUsername: a.performedBy?.username,
      createdAt: a.createdAt
    }));
  }
}
