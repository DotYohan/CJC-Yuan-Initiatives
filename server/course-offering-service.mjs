import { newId } from "./security.mjs";

const validWeekdays = new Set(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]);
const validOfferingStatuses = new Set(["PLANNED", "OPEN", "CLOSED", "CANCELLED", "COMPLETED", "ARCHIVED"]);

export const fullName = (person) => [person.firstName, person.middleName, person.lastName, person.suffix].filter(Boolean).join(" ");
export const decimal = (value) => value == null ? null : value.toString();
export const dateOnly = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : null;
export const timeOnly = (value) => value instanceof Date ? value.toISOString().slice(11, 16) : null;

export function parseTime(value) {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  return new Date(`1970-01-01T${value}:00.000Z`);
}

export class CourseOfferingService {
  static async validateAndCreateCourseOffering(database, input, options = {}) {
    const programScope = options.programScope ?? null; // null for Registrar (institution-wide), { programId, departmentId } for Program Head
    const academicTermId = typeof input?.academicTermId === "string" ? input.academicTermId.trim() : "";
    const curriculumId = typeof input?.curriculumId === "string" ? input.curriculumId.trim() : "";
    const subjectId = typeof input?.subjectId === "string" ? input.subjectId.trim() : "";
    const sectionCode = typeof input?.sectionCode === "string" ? input.sectionCode.trim() : "";
    const sectionName = typeof input?.sectionName === "string" ? input.sectionName.trim().slice(0, 150) : "";
    const offeringCode = typeof input?.offeringCode === "string" ? input.offeringCode.trim() : "";
    const facultyId = typeof input?.facultyId === "string" && input.facultyId ? input.facultyId.trim() : null;
    const roomId = typeof input?.roomId === "string" && input.roomId ? input.roomId.trim() : null;
    const weekday = typeof input?.weekday === "string" && input.weekday ? input.weekday.toUpperCase().trim() : null;
    const startsAt = input?.startsAt ? parseTime(input.startsAt) : null;
    const endsAt = input?.endsAt ? parseTime(input.endsAt) : null;
    const capacity = input?.capacity == null || input.capacity === "" ? null : Number(input.capacity);
    const requestedStatus = typeof input?.status === "string" && validOfferingStatuses.has(input.status.toUpperCase().trim())
      ? input.status.toUpperCase().trim()
      : "OPEN";

    if (!/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,39}$/.test(sectionCode)) throw new Error("SECTION_CODE_INVALID");
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,49}$/.test(offeringCode)) throw new Error("OFFERING_CODE_INVALID");
    if (capacity !== null && (!Number.isInteger(capacity) || capacity <= 0 || capacity > 32767)) throw new Error("OFFERING_INVALID");
    if (weekday && !validWeekdays.has(weekday)) throw new Error("SCHEDULE_INVALID");
    if (Boolean(weekday) !== Boolean(startsAt && endsAt) || (startsAt && startsAt >= endsAt)) throw new Error("SCHEDULE_INVALID");

    const curriculumWhere = { id: curriculumId };
    if (programScope?.programId) {
      curriculumWhere.programId = programScope.programId;
    }

    const facultyWhere = { id: facultyId, status: "ACTIVE" };
    if (programScope?.departmentId) {
      facultyWhere.OR = [
        { departmentId: programScope.departmentId },
        { departmentAssignments: { some: { departmentId: programScope.departmentId } } }
      ];
    }

    const [term, curriculum, placement, faculty, room] = await Promise.all([
      database.academicTerm.findFirst({
        where: { id: academicTermId, status: { notIn: ["CLOSED", "ARCHIVED"] } },
        select: { id: true, startsOn: true, endsOn: true }
      }),
      database.curriculum.findFirst({
        where: curriculumWhere,
        select: {
          id: true,
          programId: true,
          program: {
            select: {
              id: true,
              department: {
                select: {
                  id: true,
                  collegeId: true
                }
              }
            }
          }
        }
      }),
      database.curriculumSubject.findFirst({
        where: { curriculumId, subjectId },
        select: { subjectId: true, yearLevel: true, creditUnits: true, lectureHours: true, laboratoryHours: true }
      }),
      facultyId ? database.faculty.findFirst({
        where: { id: facultyId, status: "ACTIVE" },
        include: {
          department: { select: { id: true, collegeId: true } },
          departmentAssignments: { include: { department: { select: { id: true, collegeId: true } } } }
        }
      }) : Promise.resolve(null),
      roomId ? database.room.findFirst({ where: { id: roomId, isActive: true }, select: { id: true } }) : Promise.resolve(null)
    ]);

    if (!term) throw new Error("ACADEMIC_TERM_INVALID");
    if (!curriculum) throw new Error("CURRICULUM_NOT_FOUND");
    if (!placement) throw new Error("CURRICULUM_SUBJECT_NOT_FOUND");
    if (facultyId && !faculty) throw new Error("FACULTY_INVALID");
    if (roomId && !room) throw new Error("ROOM_INVALID");

    let isCrossCollegeOverride = false;
    if (facultyId && faculty) {
      const programCollegeId = curriculum.program?.department?.collegeId;
      const facultyCollegeIds = new Set([
        faculty.department?.collegeId,
        ...faculty.departmentAssignments.map((d) => d.department?.collegeId)
      ].filter(Boolean));
      const isSameCollege = Boolean(programCollegeId && facultyCollegeIds.has(programCollegeId));

      if (!isSameCollege) {
        if (programScope) {
          const err = new Error("Faculty member belongs to a different College. Cross-college assignment requires Registrar or Administrator override.");
          err.code = "CROSS_COLLEGE_FACULTY_FORBIDDEN";
          err.status = 403;
          throw err;
        }
        const overrideReason = input?.overrideReason || options?.overrideReason;
        if (!overrideReason || !String(overrideReason).trim()) {
          const err = new Error("Faculty member belongs to a different College. Please provide an override reason to proceed.");
          err.code = "CROSS_COLLEGE_OVERRIDE_REQUIRED";
          err.status = 422;
          throw err;
        }
        isCrossCollegeOverride = true;
      }
    }

    const targetProgramId = programScope?.programId ?? curriculum.programId;

    const existingSection = await database.classSection.findUnique({
      where: { academicTermId_programId_code: { academicTermId, programId: targetProgramId, code: sectionCode } },
      select: { id: true, curriculumId: true, yearLevel: true }
    });
    if (existingSection && ((existingSection.curriculumId && existingSection.curriculumId !== curriculumId) || existingSection.yearLevel !== placement.yearLevel)) {
      throw new Error("SECTION_CONFLICT");
    }

    if (weekday && (facultyId || roomId)) {
      const alternatives = [];
      if (roomId) alternatives.push({ roomId });
      if (facultyId) alternatives.push({ courseOffering: { faculty: { some: { facultyId } } } });
      const conflict = await database.classSchedule.findFirst({
        where: {
          weekday, startsAt: { lt: endsAt }, endsAt: { gt: startsAt },
          courseOffering: { academicTermId }, OR: alternatives
        },
        select: { id: true }
      });
      if (conflict) throw new Error("SCHEDULE_CONFLICT");
    }

    const existingOffering = await database.courseOffering.findFirst({
      where: { academicTermId, offeringCode },
      select: { id: true }
    });
    if (existingOffering) throw new Error("OFFERING_DUPLICATE");

    const section = existingSection ?? await database.classSection.create({
      data: {
        id: newId(),
        academicTermId,
        programId: targetProgramId,
        curriculumId,
        code: sectionCode,
        name: sectionName || null,
        yearLevel: placement.yearLevel,
        capacity
      },
      select: { id: true }
    });

    try {
      const created = await database.courseOffering.create({
        data: {
          id: newId(),
          academicTermId,
          subjectId,
          classSectionId: section.id,
          offeringCode,
          creditUnits: placement.creditUnits,
          lectureHours: placement.lectureHours,
          laboratoryHours: placement.laboratoryHours,
          capacity,
          status: requestedStatus,
          faculty: facultyId ? { create: { id: newId(), facultyId, role: "PRIMARY_INSTRUCTOR" } } : undefined,
          schedules: weekday ? { create: { id: newId(), roomId, weekday, startsAt, endsAt, effectiveFrom: term.startsOn, effectiveTo: term.endsOn } } : undefined
        },
        select: {
          id: true,
          offeringCode: true,
          status: true,
          creditUnits: true,
          lectureHours: true,
          laboratoryHours: true,
          capacity: true,
          subject: { select: { id: true, code: true, title: true } },
          classSection: { select: { id: true, code: true, name: true, yearLevel: true, programId: true, program: { select: { id: true, code: true, name: true } } } },
          academicTerm: { select: { id: true, code: true, name: true, termNumber: true } },
          faculty: { select: { role: true, faculty: { select: { id: true, firstName: true, middleName: true, lastName: true, suffix: true } } } },
          schedules: {
            orderBy: [{ weekday: "asc" }, { startsAt: "asc" }],
            select: { id: true, weekday: true, startsAt: true, endsAt: true, room: { select: { id: true, code: true, name: true, building: true } } }
          }
        }
      });
      return {
        ...created,
        isCrossCollegeOverride
      };
    } catch (caught) {
      if (caught?.code === "P2002") throw new Error("OFFERING_DUPLICATE");
      throw caught;
    }
  }

  static async updateCourseOffering(database, offeringId, input, options = {}) {
    const programScope = options.programScope ?? null;
    const isRegistrar = options.isRegistrar ?? (!programScope);
    const offering = await database.courseOffering.findUnique({
      where: { id: offeringId },
      include: {
        classSection: true,
        academicTerm: true,
        faculty: true,
        schedules: true
      }
    });

    if (!offering) throw new Error("OFFERING_NOT_FOUND");
    if (programScope?.programId && offering.classSection?.programId !== programScope.programId) {
      throw new Error("UNAUTHORIZED_OFFERING_ACCESS");
    }

    const updates = {};
    if (input.status) {
      const statusUpper = input.status.toUpperCase().trim();
      if (!validOfferingStatuses.has(statusUpper)) throw new Error("OFFERING_STATUS_INVALID");
      updates.status = statusUpper;
    }

    // Offering code override (Registrar authority)
    if (input.offeringCode !== undefined && isRegistrar) {
      const offeringCode = typeof input.offeringCode === "string" ? input.offeringCode.trim() : "";
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,49}$/.test(offeringCode)) throw new Error("OFFERING_CODE_INVALID");
      if (offeringCode !== offering.offeringCode) {
        const dup = await database.courseOffering.findFirst({
          where: { academicTermId: offering.academicTermId, offeringCode, id: { not: offeringId } },
          select: { id: true }
        });
        if (dup) throw new Error("OFFERING_DUPLICATE");
        updates.offeringCode = offeringCode;
      }
    }

    if (input.capacity !== undefined) {
      const capacity = input.capacity === null || input.capacity === "" ? null : Number(input.capacity);
      if (capacity !== null && (!Number.isInteger(capacity) || capacity <= 0 || capacity > 32767)) {
        throw new Error("OFFERING_INVALID");
      }
      updates.capacity = capacity;
    }

    // Section update (both Program Head and Registrar can edit section within program scope)
    if (input.sectionCode !== undefined && offering.classSection) {
      const sectionCode = typeof input.sectionCode === "string" ? input.sectionCode.trim() : "";
      if (!/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,39}$/.test(sectionCode)) throw new Error("SECTION_CODE_INVALID");
      if (sectionCode !== offering.classSection.code) {
        const targetProgramId = offering.classSection.programId;
        const existingSection = await database.classSection.findUnique({
          where: {
            academicTermId_programId_code: {
              academicTermId: offering.academicTermId,
              programId: targetProgramId,
              code: sectionCode
            }
          },
          select: { id: true, curriculumId: true, yearLevel: true }
        });

        if (existingSection && ((existingSection.curriculumId && offering.classSection.curriculumId && existingSection.curriculumId !== offering.classSection.curriculumId) || existingSection.yearLevel !== offering.classSection.yearLevel)) {
          throw new Error("SECTION_CONFLICT");
        }

        const section = existingSection ?? await database.classSection.create({
          data: {
            id: newId(),
            academicTermId: offering.academicTermId,
            programId: targetProgramId,
            curriculumId: offering.classSection.curriculumId,
            code: sectionCode,
            name: typeof input.sectionName === "string" && input.sectionName ? input.sectionName.trim().slice(0, 150) : null,
            yearLevel: offering.classSection.yearLevel,
            capacity: updates.capacity !== undefined ? updates.capacity : offering.classSection.capacity
          },
          select: { id: true }
        });

        updates.classSectionId = section.id;
      }
    }

    let isCrossCollegeOverride = false;
    if (input.facultyId !== undefined) {
      const facultyId = input.facultyId ? input.facultyId.trim() : null;
      if (facultyId) {
        const faculty = await database.faculty.findFirst({
          where: { id: facultyId, status: "ACTIVE" },
          include: {
            department: { select: { collegeId: true } },
            departmentAssignments: { include: { department: { select: { collegeId: true } } } }
          }
        });
        if (!faculty) throw new Error("FACULTY_INVALID");

        const offeringDetails = await database.courseOffering.findUnique({
          where: { id: offeringId },
          select: {
            classSection: {
              select: {
                program: {
                  select: {
                    department: { select: { collegeId: true } }
                  }
                }
              }
            }
          }
        });
        const programCollegeId = offeringDetails?.classSection?.program?.department?.collegeId;
        const facultyCollegeIds = new Set([
          faculty.department?.collegeId,
          ...faculty.departmentAssignments.map((d) => d.department?.collegeId)
        ].filter(Boolean));
        const isSameCollege = Boolean(programCollegeId && facultyCollegeIds.has(programCollegeId));

        if (!isSameCollege) {
          if (programScope) {
            const err = new Error("Faculty member belongs to a different College. Cross-college assignment requires Registrar or Administrator override.");
            err.code = "CROSS_COLLEGE_FACULTY_FORBIDDEN";
            err.status = 403;
            throw err;
          }
          const overrideReason = input?.overrideReason || options?.overrideReason;
          if (!overrideReason || !String(overrideReason).trim()) {
            const err = new Error("Faculty member belongs to a different College. Please provide an override reason to proceed.");
            err.code = "CROSS_COLLEGE_OVERRIDE_REQUIRED";
            err.status = 422;
            throw err;
          }
          isCrossCollegeOverride = true;
        }
      }

      await database.facultyCourseAssignment.deleteMany({ where: { courseOfferingId: offeringId } });
      if (facultyId) {
        await database.facultyCourseAssignment.create({
          data: { id: newId(), courseOfferingId: offeringId, facultyId, role: "PRIMARY_INSTRUCTOR" }
        });
      }
    }

    // Schedule update if weekday or times provided
    if (input.weekday !== undefined || input.roomId !== undefined || input.startsAt !== undefined || input.endsAt !== undefined) {
      const weekday = input.weekday ? input.weekday.toUpperCase().trim() : null;
      const startsAt = input.startsAt ? parseTime(input.startsAt) : null;
      const endsAt = input.endsAt ? parseTime(input.endsAt) : null;
      const roomId = input.roomId ? input.roomId.trim() : null;

      if (weekday && !validWeekdays.has(weekday)) throw new Error("SCHEDULE_INVALID");
      if (Boolean(weekday) !== Boolean(startsAt && endsAt) || (startsAt && startsAt >= endsAt)) {
        throw new Error("SCHEDULE_INVALID");
      }

      if (roomId) {
        const room = await database.room.findFirst({ where: { id: roomId, isActive: true }, select: { id: true } });
        if (!room) throw new Error("ROOM_INVALID");
      }

      if (weekday && (input.facultyId || roomId)) {
        const activeFacultyId = input.facultyId !== undefined ? input.facultyId : offering.faculty?.[0]?.facultyId;
        const alternatives = [];
        if (roomId) alternatives.push({ roomId });
        if (activeFacultyId) alternatives.push({ courseOffering: { faculty: { some: { facultyId: activeFacultyId } } } });

        const conflict = await database.classSchedule.findFirst({
          where: {
            weekday,
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
            courseOffering: { academicTermId: offering.academicTermId, id: { not: offeringId } },
            OR: alternatives
          },
          select: { id: true }
        });
        if (conflict) throw new Error("SCHEDULE_CONFLICT");
      }

      await database.classSchedule.deleteMany({ where: { courseOfferingId: offeringId } });
      if (weekday) {
        await database.classSchedule.create({
          data: {
            id: newId(),
            courseOfferingId: offeringId,
            roomId,
            weekday,
            startsAt,
            endsAt,
            effectiveFrom: offering.academicTerm.startsOn,
            effectiveTo: offering.academicTerm.endsOn
          }
        });
      }
    }

    const updated = await database.courseOffering.update({
      where: { id: offeringId },
      data: updates,
      select: {
        id: true,
        offeringCode: true,
        status: true,
        capacity: true,
        subject: { select: { id: true, code: true, title: true } },
        classSection: { select: { id: true, code: true, name: true, yearLevel: true, programId: true, program: { select: { id: true, code: true, name: true } } } },
        academicTerm: { select: { id: true, code: true, name: true } },
        faculty: { select: { role: true, faculty: { select: { id: true, firstName: true, middleName: true, lastName: true, suffix: true } } } },
        schedules: {
          orderBy: [{ weekday: "asc" }, { startsAt: "asc" }],
          select: { id: true, weekday: true, startsAt: true, endsAt: true, room: { select: { id: true, code: true, name: true, building: true } } }
        }
      }
    });

    return {
      ...updated,
      isCrossCollegeOverride
    };
  }

  static async closeCourseOffering(database, offeringId, options = {}) {
    return this.updateCourseOffering(database, offeringId, { status: "CLOSED" }, options);
  }

  static async archiveCourseOffering(database, offeringId, options = {}) {
    return this.updateCourseOffering(database, offeringId, { status: "ARCHIVED" }, options);
  }

  static async unarchiveCourseOffering(database, offeringId, options = {}) {
    return this.updateCourseOffering(database, offeringId, { status: "OPEN" }, options);
  }

  static async deleteCourseOffering(database, offeringId, options = {}) {
    const programScope = options.programScope ?? null;
    const offering = await database.courseOffering.findUnique({
      where: { id: offeringId },
      include: {
        classSection: true,
        enrollmentItems: { select: { id: true } }
      }
    });

    if (!offering) throw new Error("OFFERING_NOT_FOUND");
    if (programScope?.programId && offering.classSection?.programId !== programScope.programId) {
      throw new Error("UNAUTHORIZED_OFFERING_ACCESS");
    }
    if (offering.enrollmentItems.length > 0) {
      throw new Error("OFFERING_HAS_ENROLLMENTS");
    }

    await database.facultyCourseAssignment.deleteMany({ where: { courseOfferingId: offeringId } });
    await database.classSchedule.deleteMany({ where: { courseOfferingId: offeringId } });
    await database.courseOffering.delete({ where: { id: offeringId } });

    return { deleted: true, id: offeringId };
  }

  static async listOfferings(database, filters = {}, options = {}) {
    const programScope = options.programScope ?? null;
    const where = {};

    if (programScope?.programId) {
      where.classSection = { programId: programScope.programId };
    } else if (filters.programId) {
      where.classSection = { programId: filters.programId };
    }

    if (filters.academicTermId) {
      where.academicTermId = filters.academicTermId;
    }

    if (filters.status) {
      const s = filters.status.toUpperCase().trim();
      if (s === "ACTIVE") {
        where.status = { in: ["OPEN", "CLOSED"] };
      } else if (s !== "ALL") {
        where.status = s;
      }
    }

    if (filters.query) {
      const q = filters.query.trim();
      where.OR = [
        { offeringCode: { contains: q, mode: "insensitive" } },
        { subject: { code: { contains: q, mode: "insensitive" } } },
        { subject: { title: { contains: q, mode: "insensitive" } } },
        { classSection: { code: { contains: q, mode: "insensitive" } } },
        { faculty: { some: { faculty: { OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } }
        ] } } } },
        { schedules: { some: { room: { code: { contains: q, mode: "insensitive" } } } } }
      ];
    }

    const offerings = await database.courseOffering.findMany({
      where,
      orderBy: [{ academicTerm: { startsOn: "desc" } }, { offeringCode: "asc" }],
      select: {
        id: true,
        offeringCode: true,
        status: true,
        creditUnits: true,
        lectureHours: true,
        laboratoryHours: true,
        capacity: true,
        academicTerm: { select: { id: true, code: true, name: true, termNumber: true } },
        subject: { select: { id: true, code: true, title: true } },
        classSection: { select: { id: true, code: true, name: true, programId: true, yearLevel: true, program: { select: { id: true, code: true, name: true } } } },
        faculty: { select: { role: true, faculty: { select: { id: true, firstName: true, middleName: true, lastName: true, suffix: true } } } },
        schedules: {
          orderBy: [{ weekday: "asc" }, { startsAt: "asc" }],
          select: { id: true, weekday: true, startsAt: true, endsAt: true, room: { select: { id: true, code: true, name: true, building: true } } }
        },
        _count: {
          select: {
            enrollmentItems: {
              where: {
                status: { in: ["PENDING", "ENROLLED", "COMPLETED"] },
                enrollment: { status: { notIn: ["CANCELLED", "WITHDRAWN"] } }
              }
            }
          }
        }
      }
    });

    return offerings.map((offering) => ({
      ...offering,
      creditUnits: decimal(offering.creditUnits),
      lectureHours: decimal(offering.lectureHours),
      laboratoryHours: decimal(offering.laboratoryHours),
      enrolledCount: offering._count?.enrollmentItems ?? 0,
      faculty: offering.faculty.map((item) => ({ id: item.faculty.id, name: fullName(item.faculty), role: item.role })),
      schedules: offering.schedules.map((item) => ({ ...item, startsAt: timeOnly(item.startsAt), endsAt: timeOnly(item.endsAt) })),
      _count: undefined
    }));
  }

  static async listCurriculumSubjects(database, filters = {}) {
    const where = {
      curriculum: { status: { not: "RETIRED" } },
      subject: { status: "ACTIVE", isActive: true }
    };

    if (filters.programId) {
      where.curriculum = { ...where.curriculum, programId: filters.programId };
    }

    if (filters.curriculumId) {
      where.curriculumId = filters.curriculumId;
    }

    if (filters.yearLevel) {
      where.yearLevel = Number(filters.yearLevel);
    }

    if (filters.termNumber) {
      where.termNumber = Number(filters.termNumber);
    }

    if (filters.query) {
      const q = filters.query.trim();
      where.OR = [
        { subject: { code: { contains: q, mode: "insensitive" } } },
        { subject: { title: { contains: q, mode: "insensitive" } } },
        { curriculum: { program: { code: { contains: q, mode: "insensitive" } } } }
      ];
    }

    const curriculumSubjects = await database.curriculumSubject.findMany({
      where,
      orderBy: [
        { curriculum: { program: { code: "asc" } } },
        { curriculum: { version: "desc" } },
        { yearLevel: "asc" },
        { termNumber: "asc" },
        { sortOrder: "asc" },
        { subject: { code: "asc" } }
      ],
      select: {
        id: true,
        subjectId: true,
        curriculumId: true,
        yearLevel: true,
        termNumber: true,
        creditUnits: true,
        lectureHours: true,
        laboratoryHours: true,
        type: true,
        isRequired: true,
        subject: {
          select: {
            id: true,
            code: true,
            title: true,
            description: true,
            status: true
          }
        },
        curriculum: {
          select: {
            id: true,
            code: true,
            name: true,
            version: true,
            programId: true,
            program: {
              select: {
                id: true,
                code: true,
                name: true
              }
            }
          }
        }
      }
    });

    return curriculumSubjects.map((item) => ({
      id: item.id,
      subjectId: item.subjectId,
      subjectCode: item.subject.code,
      subjectTitle: item.subject.title,
      subjectDescription: item.subject.description || item.subject.title,
      creditUnits: decimal(item.creditUnits),
      lectureHours: decimal(item.lectureHours),
      laboratoryHours: decimal(item.laboratoryHours),
      yearLevel: item.yearLevel,
      termNumber: item.termNumber,
      type: item.type,
      isRequired: item.isRequired,
      programId: item.curriculum.programId,
      programCode: item.curriculum.program.code,
      programName: item.curriculum.program.name,
      curriculumId: item.curriculum.id,
      curriculumCode: item.curriculum.code,
      curriculumName: item.curriculum.name,
      curriculumVersion: item.curriculum.version
    }));
  }

  static async offeringFormData(database, options = {}) {
    const programScope = options.programScope ?? null;
    const now = new Date();

    const facultyWhere = { status: "ACTIVE" };
    if (programScope?.departmentId) {
      facultyWhere.OR = [
        { departmentId: programScope.departmentId },
        { departmentAssignments: { some: { departmentId: programScope.departmentId, startsOn: { lte: now }, OR: [{ endsOn: null }, { endsOn: { gte: now } }] } } }
      ];
    }

    const [programs, academicTerms, curricula, faculty, rooms] = await Promise.all([
      database.program.findMany({
        where: programScope?.programId ? { id: programScope.programId, isActive: true } : { isActive: true },
        orderBy: { code: "asc" },
        select: { id: true, code: true, name: true }
      }),
      database.academicTerm.findMany({
        where: { status: { not: "ARCHIVED" } },
        orderBy: { startsOn: "desc" },
        take: 12,
        select: { id: true, code: true, name: true, termNumber: true, startsOn: true, endsOn: true, status: true, academicYear: { select: { id: true, code: true, name: true } } }
      }),
      database.curriculum.findMany({
        where: programScope?.programId ? { programId: programScope.programId, status: { not: "RETIRED" } } : { status: { not: "RETIRED" } },
        orderBy: [{ effectiveFromYear: "desc" }, { version: "desc" }],
        select: {
          id: true,
          programId: true,
          code: true,
          name: true,
          version: true,
          status: true,
          subjects: {
            orderBy: [{ yearLevel: "asc" }, { termNumber: "asc" }, { sortOrder: "asc" }, { subject: { code: "asc" } }],
            select: {
              id: true,
              subjectId: true,
              yearLevel: true,
              termNumber: true,
              creditUnits: true,
              subject: { select: { id: true, code: true, title: true } }
            }
          }
        }
      }),
      database.faculty.findMany({
        where: facultyWhere,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        select: { id: true, employeeNumber: true, firstName: true, middleName: true, lastName: true, suffix: true, academicRank: true }
      }),
      database.room.findMany({
        where: { isActive: true },
        orderBy: [{ building: "asc" }, { code: "asc" }],
        select: { id: true, code: true, name: true, building: true, roomType: true, capacity: true }
      })
    ]);

    return {
      programs,
      academicTerms: academicTerms.map((term) => ({ ...term, startsOn: dateOnly(term.startsOn), endsOn: dateOnly(term.endsOn) })),
      curricula: curricula.map((c) => ({
        ...c,
        subjects: c.subjects.map((s) => ({
          id: s.id,
          subjectId: s.subjectId,
          yearLevel: s.yearLevel,
          termNumber: s.termNumber,
          creditUnits: decimal(s.creditUnits),
          subjectCode: s.subject.code,
          subjectTitle: s.subject.title
        }))
      })),
      faculty: faculty.map((f) => ({ id: f.id, name: fullName(f) })),
      rooms
    };
  }
}
