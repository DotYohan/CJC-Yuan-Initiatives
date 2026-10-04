import { newId, normalizeIdentifier, hashPassword, validatePassword } from "./security.mjs";

export class AdminFacultyService {
  constructor(database, config) {
    this.database = database;
    this.config = config;
  }

  async listColleges() {
    return this.database.college.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        shortName: true,
        departments: {
          where: { isActive: true },
          select: { id: true, code: true, name: true }
        }
      },
      orderBy: { code: "asc" }
    });
  }

  async listFaculty() {
    const list = await this.database.faculty.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            status: true,
            mustChangePassword: true,
            createdAt: true
          }
        },
        department: {
          select: {
            id: true,
            code: true,
            name: true,
            college: {
              select: {
                id: true,
                code: true,
                name: true,
                shortName: true
              }
            }
          }
        },
        _count: {
          select: {
            courseAssignments: true
          }
        }
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
    });

    return list.map((f) => ({
      id: f.id,
      userId: f.userId,
      employeeNumber: f.employeeNumber,
      firstName: f.firstName,
      middleName: f.middleName,
      lastName: f.lastName,
      suffix: f.suffix,
      fullName: [f.firstName, f.middleName, f.lastName, f.suffix].filter(Boolean).join(" "),
      institutionalEmail: f.institutionalEmail || f.user?.email || "",
      status: f.status,
      userStatus: f.user?.status || "ACTIVE",
      college: {
        id: f.department.college.id,
        code: f.department.college.code,
        name: f.department.college.name,
        shortName: f.department.college.shortName
      },
      assignedClassesCount: f._count.courseAssignments,
      createdAt: f.createdAt
    }));
  }

  async getFacultyById(id) {
    const f = await this.database.faculty.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            status: true
          }
        },
        department: {
          include: {
            college: true
          }
        },
        _count: {
          select: {
            courseAssignments: true
          }
        }
      }
    });
    if (!f) return null;

    return {
      id: f.id,
      userId: f.userId,
      employeeNumber: f.employeeNumber,
      firstName: f.firstName,
      middleName: f.middleName,
      lastName: f.lastName,
      suffix: f.suffix,
      fullName: [f.firstName, f.middleName, f.lastName, f.suffix].filter(Boolean).join(" "),
      institutionalEmail: f.institutionalEmail || f.user?.email || "",
      status: f.status,
      userStatus: f.user?.status || "ACTIVE",
      college: {
        id: f.department.college.id,
        code: f.department.college.code,
        name: f.department.college.name
      },
      assignedClassesCount: f._count.courseAssignments,
      createdAt: f.createdAt
    };
  }

  async createFaculty(data, adminUserId) {
    const firstName = String(data.firstName || "").trim();
    const lastName = String(data.lastName || "").trim();
    const middleName = data.middleName ? String(data.middleName).trim() : null;
    const suffix = data.suffix ? String(data.suffix).trim() : null;
    const employeeNumber = String(data.employeeNumber || "").trim();
    const email = String(data.email || data.institutionalEmail || "").trim().toLowerCase();
    const collegeId = String(data.collegeId || "").trim();

    if (!firstName || !lastName) {
      const err = new Error("First name and last name are required.");
      err.code = "NAME_REQUIRED";
      err.status = 422;
      throw err;
    }

    if (!employeeNumber) {
      const err = new Error("Employee ID is required.");
      err.code = "EMPLOYEE_NUMBER_REQUIRED";
      err.status = 422;
      throw err;
    }

    if (!email || !email.includes("@")) {
      const err = new Error("Valid institutional email is required.");
      err.code = "EMAIL_INVALID";
      err.status = 422;
      throw err;
    }

    if (!collegeId) {
      const err = new Error("College assignment is required.");
      err.code = "COLLEGE_REQUIRED";
      err.status = 422;
      throw err;
    }

    const college = await this.database.college.findFirst({
      where: { id: collegeId, isActive: true },
      include: { departments: { where: { isActive: true }, take: 1 } }
    });

    if (!college) {
      const err = new Error("Selected college does not exist or is inactive.");
      err.code = "COLLEGE_NOT_FOUND";
      err.status = 404;
      throw err;
    }

    let department = college.departments[0];
    if (!department) {
      department = await this.database.department.create({
        data: {
          id: newId(),
          collegeId: college.id,
          code: college.code,
          name: college.name,
          isActive: true
        }
      });
    }

    const normEmp = normalizeIdentifier(employeeNumber);
    const existingFaculty = await this.database.faculty.findUnique({
      where: { employeeNumberNormalized: normEmp }
    });
    if (existingFaculty) {
      const err = new Error("A faculty member with that employee number already exists.");
      err.code = "EMPLOYEE_NUMBER_EXISTS";
      err.status = 409;
      throw err;
    }

    const username = data.username ? String(data.username).trim() : employeeNumber;
    const normUser = normalizeIdentifier(username);
    const normEmail = normalizeIdentifier(email);

    const existingUser = await this.database.user.findFirst({
      where: {
        OR: [
          { usernameNormalized: normUser },
          { emailNormalized: normEmail }
        ]
      }
    });
    if (existingUser) {
      const err = new Error("A user account with that username or email already exists.");
      err.code = "ACCOUNT_EXISTS";
      err.status = 409;
      throw err;
    }

    const rawPassword = data.password ? String(data.password) : `Faculty-${employeeNumber}!`;
    const passwordError = validatePassword(rawPassword, this.config);
    if (passwordError) {
      const err = new Error(passwordError);
      err.code = "PASSWORD_POLICY";
      err.status = 422;
      throw err;
    }

    const facultyRole = await this.database.role.findUnique({
      where: { slug: "faculty" }
    });
    if (!facultyRole) {
      const err = new Error("Faculty role is not configured in the system.");
      err.code = "ROLE_NOT_FOUND";
      err.status = 500;
      throw err;
    }

    const passwordHash = await hashPassword(rawPassword, this.config.scrypt);
    const now = new Date();
    const userId = newId();
    const facultyId = newId();

    return this.database.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          id: userId,
          username,
          usernameNormalized: normUser,
          displayName: [firstName, lastName].join(" "),
          email,
          emailNormalized: normEmail,
          passwordHash,
          status: "ACTIVE",
          mustChangePassword: true,
          createdAt: now,
          updatedAt: now,
          userRoles: {
            create: {
              roleId: facultyRole.id,
              isPrimary: true,
              assignedByUserId: adminUserId
            }
          }
        }
      });

      const faculty = await tx.faculty.create({
        data: {
          id: facultyId,
          userId: user.id,
          employeeNumber,
          employeeNumberNormalized: normEmp,
          departmentId: department.id,
          firstName,
          middleName,
          lastName,
          suffix,
          institutionalEmail: email,
          status: "ACTIVE",
          createdAt: now,
          updatedAt: now
        },
        include: {
          department: {
            include: {
              college: true
            }
          }
        }
      });

      return {
        id: faculty.id,
        userId: user.id,
        username: user.username,
        employeeNumber: faculty.employeeNumber,
        fullName: [faculty.firstName, faculty.middleName, faculty.lastName, faculty.suffix].filter(Boolean).join(" "),
        email: user.email,
        college: {
          id: faculty.department.college.id,
          code: faculty.department.college.code,
          name: faculty.department.college.name
        },
        status: faculty.status,
        tempPassword: rawPassword
      };
    });
  }

  async updateFaculty(facultyId, data, adminUserId) {
    const existing = await this.database.faculty.findUnique({
      where: { id: facultyId },
      include: { user: true, department: true }
    });
    if (!existing) {
      const err = new Error("Faculty member not found.");
      err.code = "FACULTY_NOT_FOUND";
      err.status = 404;
      throw err;
    }

    const updates = {};
    if (data.firstName !== undefined) updates.firstName = String(data.firstName).trim();
    if (data.lastName !== undefined) updates.lastName = String(data.lastName).trim();
    if (data.middleName !== undefined) updates.middleName = data.middleName ? String(data.middleName).trim() : null;
    if (data.suffix !== undefined) updates.suffix = data.suffix ? String(data.suffix).trim() : null;

    if (data.employeeNumber !== undefined) {
      const empNum = String(data.employeeNumber).trim();
      const normEmp = normalizeIdentifier(empNum);
      if (normEmp !== existing.employeeNumberNormalized) {
        const conflict = await this.database.faculty.findUnique({
          where: { employeeNumberNormalized: normEmp }
        });
        if (conflict) {
          const err = new Error("A faculty member with that employee number already exists.");
          err.code = "EMPLOYEE_NUMBER_EXISTS";
          err.status = 409;
          throw err;
        }
        updates.employeeNumber = empNum;
        updates.employeeNumberNormalized = normEmp;
      }
    }

    if (data.institutionalEmail !== undefined || data.email !== undefined) {
      const rawEmail = String(data.institutionalEmail || data.email || "").trim().toLowerCase();
      if (rawEmail && !rawEmail.includes("@")) {
        const err = new Error("Valid institutional email is required.");
        err.code = "EMAIL_INVALID";
        err.status = 422;
        throw err;
      }
      updates.institutionalEmail = rawEmail;
    }

    if (data.collegeId) {
      const college = await this.database.college.findFirst({
        where: { id: String(data.collegeId).trim(), isActive: true },
        include: { departments: { where: { isActive: true }, take: 1 } }
      });
      if (!college) {
        const err = new Error("Selected college does not exist or is inactive.");
        err.code = "COLLEGE_NOT_FOUND";
        err.status = 404;
        throw err;
      }
      let department = college.departments[0];
      if (!department) {
        department = await this.database.department.create({
          data: {
            id: newId(),
            collegeId: college.id,
            code: college.code,
            name: college.name,
            isActive: true
          }
        });
      }
      updates.departmentId = department.id;
    }

    const now = new Date();
    updates.updatedAt = now;

    // Handle account status toggle (ACTIVE vs DEACTIVATED/DISABLED)
    let newStatus = existing.status;
    let newUserStatus = existing.user?.status;
    if (data.status !== undefined) {
      const normalizedStatus = String(data.status).toUpperCase();
      if (["ACTIVE", "ON_LEAVE", "SEPARATED", "RETIRED", "DEACTIVATED"].includes(normalizedStatus)) {
        if (normalizedStatus === "DEACTIVATED" || normalizedStatus === "SEPARATED") {
          newStatus = "SEPARATED";
          newUserStatus = "DISABLED";
        } else {
          newStatus = normalizedStatus;
          newUserStatus = "ACTIVE";
        }
        updates.status = newStatus;
      }
    }

    return this.database.$transaction(async (tx) => {
      const updatedFaculty = await tx.faculty.update({
        where: { id: facultyId },
        data: updates,
        include: {
          department: {
            include: {
              college: true
            }
          }
        }
      });

      if (existing.userId) {
        const userUpdates = { updatedAt: now };
        if (newUserStatus && newUserStatus !== existing.user.status) {
          userUpdates.status = newUserStatus;
          userUpdates.authorizationVersion = { increment: 1 };
        }
        if (updates.firstName || updates.lastName) {
          const fn = updates.firstName || existing.firstName;
          const ln = updates.lastName || existing.lastName;
          userUpdates.displayName = [fn, ln].join(" ");
        }
        if (updates.institutionalEmail) {
          userUpdates.email = updates.institutionalEmail;
          userUpdates.emailNormalized = normalizeIdentifier(updates.institutionalEmail);
        }
        await tx.user.update({
          where: { id: existing.userId },
          data: userUpdates
        });

        if (newUserStatus === "DISABLED") {
          await tx.session.updateMany({
            where: { userId: existing.userId, revokedAt: null },
            data: { revokedAt: now }
          });
        }
      }

      return {
        id: updatedFaculty.id,
        userId: existing.userId,
        employeeNumber: updatedFaculty.employeeNumber,
        firstName: updatedFaculty.firstName,
        middleName: updatedFaculty.middleName,
        lastName: updatedFaculty.lastName,
        suffix: updatedFaculty.suffix,
        fullName: [updatedFaculty.firstName, updatedFaculty.middleName, updatedFaculty.lastName, updatedFaculty.suffix].filter(Boolean).join(" "),
        email: updatedFaculty.institutionalEmail,
        college: {
          id: updatedFaculty.department.college.id,
          code: updatedFaculty.department.college.code,
          name: updatedFaculty.department.college.name
        },
        status: updatedFaculty.status,
        userStatus: newUserStatus || "ACTIVE"
      };
    });
  }
}
