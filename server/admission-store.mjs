import { Prisma } from "@prisma/client";
import { newId, normalizeIdentifier, hashPassword, randomToken } from "./security.mjs";

const emailPart = (value) => String(value || "")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]/g, "");

const uniqueSchoolEmail = async (transaction, firstName, lastName) => {
  const base = `${emailPart(lastName)}.${emailPart(firstName)}`;
  let candidate = `${base}@g.cjc.edu.ph`;
  let suffix = 0;
  while (await transaction.user.findUnique({ where: { emailNormalized: normalizeIdentifier(candidate) } })) {
    suffix += 1;
    candidate = `${base}${suffix}@g.cjc.edu.ph`;
  }
  return candidate;
};

const nextStudentNumber = async (transaction, admissionYear) => {
  await transaction.$executeRaw`
    INSERT INTO "student_number_sequences" ("admission_year", "next_number")
    SELECT ${admissionYear}, COALESCE(MAX(CAST(NULLIF(SPLIT_PART("student_number", '-', 3), '') AS INTEGER)) + 1, 1)
    FROM "students"
    WHERE "student_number" LIKE ${`001-${admissionYear}-%`}
    ON CONFLICT ("admission_year") DO NOTHING
  `;
  const rows = await transaction.$queryRaw`
    SELECT "next_number" FROM "student_number_sequences"
    WHERE "admission_year" = ${admissionYear}
    FOR UPDATE
  `;
  const nextNumber = Number(rows[0]?.next_number);
  await transaction.studentNumberSequence.update({
    where: { admissionYear },
    data: { nextNumber: nextNumber + 1 }
  });
  return `001-${admissionYear}-${String(nextNumber).padStart(5, "0")}`;
};

export class AdmissionStore {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async listPrograms() {
    return this.prisma.program.findMany({
      where: {
        isActive: true,
        department: { is: { isActive: true, college: { is: { isActive: true } } } }
      },
      select: { id: true, code: true, name: true, credential: true },
      orderBy: { name: "asc" }
    });
  }

  async registerStudent(input, config) {
    const role = await this.prisma.role.findUnique({ where: { slug: "student" } });
    if (!role) throw new Error("STUDENT_ROLE_MISSING");
    const term = await this.prisma.academicTerm.findFirst({
      where: { status: "ENROLLMENT_OPEN" },
      orderBy: { startsOn: "asc" }
    }) ?? await this.prisma.academicTerm.findFirst({
      where: { status: { not: "ARCHIVED" } },
      orderBy: { startsOn: "desc" }
    });
    if (!term) throw new Error("ACADEMIC_TERM_MISSING");
    const fallbackProgram = await this.prisma.program.findFirst({
      where: { isActive: true },
      select: { id: true },
      orderBy: { name: "asc" }
    });
    if (!fallbackProgram) throw new Error("PROGRAM_INVALID");

    return this.prisma.$transaction(async (transaction) => {
      const email = input.institutionalEmail
        ? input.institutionalEmail.trim().toLowerCase()
        : await uniqueSchoolEmail(transaction, input.firstName, input.lastName);
      const studentNumber = await nextStudentNumber(transaction, input.admissionYear);
      const rawPassword = input.password && typeof input.password === "string" && input.password.length >= 8
        ? input.password
        : randomToken(32);
      const passwordHash = await hashPassword(rawPassword, config.scrypt);
      const user = await transaction.user.create({
        data: {
          id: newId(),
          username: email,
          usernameNormalized: normalizeIdentifier(email),
          displayName: [input.firstName, input.middleName, input.lastName].filter(Boolean).join(" "),
          email,
          emailNormalized: normalizeIdentifier(email),
          passwordHash,
          status: "ACTIVE",
          mustChangePassword: false,
          userRoles: { create: { roleId: role.id, isPrimary: true } }
        }
      });
      if (input.googleProfile) {
        await transaction.userGoogleAuth.create({
          data: {
            id: newId(),
            userId: user.id,
            googleSub: input.googleProfile.googleSub,
            email,
            emailNormalized: normalizeIdentifier(email),
            avatarUrl: input.googleProfile.picture || null,
            linkedAt: new Date(),
            lastLoginAt: new Date()
          }
        });
      }
      const student = await transaction.student.create({
        data: {
          userId: user.id,
          studentNumber,
          studentNumberNormalized: normalizeIdentifier(studentNumber),
          firstName: input.firstName,
          middleName: input.middleName || null,
          lastName: input.lastName,
          dateOfBirth: input.birthDate ? new Date(input.birthDate) : null,
          institutionalEmail: email,
          admissionYear: input.admissionYear,
          status: "APPLICANT"
        }
      });
      const entranceFee = await transaction.paymentType.findFirst({
        where: { name: "Entrance Fee", isActive: true },
        select: { id: true, amount: true }
      });
      if (!entranceFee) throw new Error("ENTRANCE_FEE_NOT_CONFIGURED");
      await transaction.studentObligation.create({
        data: {
          id: newId(),
          studentId: student.id,
          paymentTypeId: entranceFee.id,
          academicYearId: term.academicYearId,
          academicTermId: term.id,
          amountDue: entranceFee.amount,
          status: "UNPAID",
          createdByUserId: null
        }
      });
      const applicationCount = await transaction.admissionApplication.count();
      const applicationNumber = `APP-${input.admissionYear}-${String(applicationCount + 1).padStart(5, "0")}`;
      await transaction.admissionApplication.create({
        data: {
          id: newId(),
          applicationNumber,
          applicationNumberNormalized: normalizeIdentifier(applicationNumber),
          applicantUserId: user.id,
          intendedProgramId: fallbackProgram.id,
          academicTermId: term.id,
          convertedStudentId: student.id,
          firstName: input.firstName,
          middleName: input.middleName || null,
          lastName: input.lastName,
          birthDate: input.birthDate ? new Date(input.birthDate) : null,
          email: input.personalEmail || email,
          phone: input.mobileNumber,
          status: "DRAFT",
          submittedAt: null,
          history: {
            create: {
              toStatus: "DRAFT",
              actionType: "REGISTER_STUDENT",
              changedByUserId: user.id,
              changedByRole: "student",
              remarks: "Student self-registration completed (Draft)."
            }
          }
        }
      });
      return { studentNumber, schoolEmail: email, applicationNumber, userId: user.id };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
