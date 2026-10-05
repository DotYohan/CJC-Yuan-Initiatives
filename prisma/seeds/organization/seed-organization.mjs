import { loadAcademicSeedPlan } from '../../academic/academic-seed.mjs';

const LEGACY_ENGINEERING_DEPARTMENT_CODES = Object.freeze(['DECE', 'DCpE', 'DCE']);

async function assertOrganizationCutoverSafe(transaction, plan) {
  const existingCollege = await transaction.college.findUnique({
    where: { codeNormalized: plan.college.codeNormalized },
    select: { id: true, code: true }
  });
  const [legacyComputerProgram, canonicalComputerProgram] = await Promise.all([
    transaction.program.findUnique({ where: { codeNormalized: 'bscpe' }, select: { id: true, code: true } }),
    transaction.program.findUnique({ where: { codeNormalized: 'bscoe' }, select: { id: true, code: true } })
  ]);

  if (legacyComputerProgram && canonicalComputerProgram && legacyComputerProgram.id !== canonicalComputerProgram.id) {
    throw new Error('Conflicting BSCpE and BSCOE Program records exist; automatic seeding is unsafe.');
  }
  if (legacyComputerProgram) {
    throw new Error(
      `Legacy Program ${legacyComputerProgram.code} (${legacyComputerProgram.id}) still exists. ` +
      'Run the reviewed academic organization cutover before the canonical organization seed.'
    );
  }

  if (!existingCollege) return;
  const legacyDepartments = await transaction.department.findMany({
    where: {
      collegeId: existingCollege.id,
      code: { in: LEGACY_ENGINEERING_DEPARTMENT_CODES }
    },
    select: { id: true, code: true }
  });
  if (legacyDepartments.length > 0) {
    throw new Error(
      `Legacy Engineering Departments remain (${legacyDepartments.map((item) => `${item.code}:${item.id}`).join(', ')}). ` +
      'Run the reviewed academic organization cutover before seeding.'
    );
  }
}

export const DOCUMENT_TYPE_SEEDS = Object.freeze([
  {
    name: "Birth Certificate",
    description: "PSA-authenticated birth certificate for identity verification.",
    required: true,
    active: true,
    sortOrder: 1
  },
  {
    name: "Form 138",
    description: "Report card (Form 138-A) from previous school year.",
    required: true,
    active: true,
    sortOrder: 2
  },
  {
    name: "Good Moral Certificate",
    description: "Certificate of Good Moral Character from previous school.",
    required: true,
    active: true,
    sortOrder: 3
  },
  {
    name: "Medical Certificate",
    description: "Medical certificate from licensed physician.",
    required: true,
    active: true,
    sortOrder: 4
  },
  {
    name: "2x2 Picture",
    description: "Recent 2x2 ID picture with white background.",
    required: true,
    active: true,
    sortOrder: 5
  }
]);

export const REQUEST_TYPE_SEEDS = Object.freeze([
  {
    code: 'DOC_TOR',
    name: 'Transcript of Records (TOR)',
    description: 'Official academic transcript of completed coursework and grades.',
    defaultFeeAmount: 150.00,
    serviceDays: 3,
    isActive: true
  },
  {
    code: 'DOC_COG',
    name: 'Certificate of Grades (COG)',
    description: 'Certified breakdown of semester grades for scholarship or evaluation.',
    defaultFeeAmount: 75.00,
    serviceDays: 2,
    isActive: true
  },
  {
    code: 'DOC_COR',
    name: 'Certificate of Registration (COR)',
    description: 'Official verified copy of semester course registration and enrollment load.',
    defaultFeeAmount: 50.00,
    serviceDays: 1,
    isActive: true
  },
  {
    code: 'DOC_GMC',
    name: 'Certificate of Good Moral Character',
    description: 'Certification of non-disciplinary record and student conduct.',
    defaultFeeAmount: 100.00,
    serviceDays: 2,
    isActive: true
  },
  {
    code: 'REQ_ADD_DROP',
    name: 'Adding / Dropping of Subjects',
    description: 'Formal application to modify registered course load after enrollment.',
    defaultFeeAmount: 50.00,
    serviceDays: 2,
    isActive: true
  },
  {
    code: 'REQ_SUBJ_OFFER',
    name: 'Special Subject Offering Request',
    description: 'Petition to open an unoffered or off-semester subject offering.',
    defaultFeeAmount: 0.00,
    serviceDays: 5,
    isActive: true
  },
  {
    code: 'REQ_OVERLOAD',
    name: 'Academic Overload Petition',
    description: 'Request for graduating students to carry academic units beyond the regular curriculum maximum.',
    defaultFeeAmount: 0.00,
    serviceDays: 3,
    isActive: true
  }
]);

export async function seedOrganizationAndReferenceData(prisma) {
  const plan = await loadAcademicSeedPlan();

  return prisma.$transaction(async (tx) => {
    await assertOrganizationCutoverSafe(tx, plan);

    // 1. Seed College
    const college = await tx.college.upsert({
      where: { codeNormalized: plan.college.codeNormalized },
      update: {
        name: plan.college.name,
        shortName: plan.college.shortName,
        isActive: plan.college.isActive
      },
      create: {
        code: plan.college.code,
        codeNormalized: plan.college.codeNormalized,
        name: plan.college.name,
        shortName: plan.college.shortName,
        isActive: plan.college.isActive
      }
    });

    // 2. Seed Departments
    const departments = new Map();
    for (const dept of plan.departments) {
      const existing = await tx.department.findFirst({
        where: { collegeId: college.id, code: dept.code }
      });
      let created;
      if (existing) {
        created = await tx.department.update({
          where: { id: existing.id },
          data: { name: dept.name, isActive: dept.isActive }
        });
      } else {
        created = await tx.department.create({
          data: {
            collegeId: college.id,
            code: dept.code,
            name: dept.name,
            isActive: dept.isActive
          }
        });
      }
      departments.set(dept.code, created);
    }

    // 3. Seed Programs
    const programs = new Map();
    for (const prog of plan.programs) {
      const dept = departments.get(prog.departmentCode);
      if (!dept) throw new Error(`Department ${prog.departmentCode} not found for program ${prog.code}`);
      const program = await tx.program.upsert({
        where: { codeNormalized: prog.codeNormalized },
        update: {
          name: prog.name,
          credential: prog.credential,
          durationYears: prog.durationYears,
          termsPerYear: prog.termsPerYear,
          departmentId: dept.id,
          isActive: prog.isActive
        },
        create: {
          code: prog.code,
          codeNormalized: prog.codeNormalized,
          name: prog.name,
          credential: prog.credential,
          durationYears: prog.durationYears,
          termsPerYear: prog.termsPerYear,
          departmentId: dept.id,
          isActive: prog.isActive
        }
      });
      programs.set(program.code, program);
    }

    // 4. Seed Document Types
    for (const docType of DOCUMENT_TYPE_SEEDS) {
      await tx.documentType.upsert({
        where: { name: docType.name },
        update: {
          description: docType.description,
          required: docType.required,
          active: docType.active,
          sortOrder: docType.sortOrder
        },
        create: {
          name: docType.name,
          description: docType.description,
          required: docType.required,
          active: docType.active,
          sortOrder: docType.sortOrder
        }
      });
    }

    // 5. Seed Request Types
    for (const reqType of REQUEST_TYPE_SEEDS) {
      await tx.requestType.upsert({
        where: { code: reqType.code },
        update: {
          name: reqType.name,
          description: reqType.description,
          defaultFeeAmount: reqType.defaultFeeAmount,
          serviceDays: reqType.serviceDays,
          isActive: reqType.isActive
        },
        create: {
          code: reqType.code,
          name: reqType.name,
          description: reqType.description,
          defaultFeeAmount: reqType.defaultFeeAmount,
          serviceDays: reqType.serviceDays,
          isActive: reqType.isActive
        }
      });
    }

    // 5. Seed Academic Year & Terms
    const ay = await tx.academicYear.upsert({
      where: { code: 'AY-2026-2027' },
      update: {
        name: 'Academic Year 2026–2027',
        startsOn: new Date('2026-08-01'),
        endsOn: new Date('2027-05-31'),
        status: 'ACTIVE'
      },
      create: {
        code: 'AY-2026-2027',
        name: 'Academic Year 2026–2027',
        startsOn: new Date('2026-08-01'),
        endsOn: new Date('2027-05-31'),
        status: 'ACTIVE'
      }
    });

    await tx.academicTerm.upsert({
      where: { code: 'AY-2026-2027-1ST' },
      update: {
        academicYearId: ay.id,
        name: '1st Semester 2026–2027',
        termNumber: 1,
        startsOn: new Date('2026-08-01'),
        endsOn: new Date('2026-12-20'),
        enrollmentStarts: new Date('2026-07-15T00:00:00Z'),
        enrollmentEnds: new Date('2026-08-30T23:59:59Z'),
        status: 'ACTIVE'
      },
      create: {
        academicYearId: ay.id,
        code: 'AY-2026-2027-1ST',
        name: '1st Semester 2026–2027',
        termNumber: 1,
        startsOn: new Date('2026-08-01'),
        endsOn: new Date('2026-12-20'),
        enrollmentStarts: new Date('2026-07-15T00:00:00Z'),
        enrollmentEnds: new Date('2026-08-30T23:59:59Z'),
        status: 'ACTIVE'
      }
    });

    await tx.academicTerm.upsert({
      where: { code: 'AY-2026-2027-2ND' },
      update: {
        academicYearId: ay.id,
        name: '2nd Semester 2026–2027',
        termNumber: 2,
        startsOn: new Date('2027-01-10'),
        endsOn: new Date('2027-05-31'),
        status: 'PLANNED'
      },
      create: {
        academicYearId: ay.id,
        code: 'AY-2026-2027-2ND',
        name: '2nd Semester 2026–2027',
        termNumber: 2,
        startsOn: new Date('2027-01-10'),
        endsOn: new Date('2027-05-31'),
        status: 'PLANNED'
      }
    });

    return {
      collegeCount: 1,
      departmentCount: departments.size,
      programCount: programs.size,
      documentTypeCount: DOCUMENT_TYPE_SEEDS.length,
      requestTypeCount: REQUEST_TYPE_SEEDS.length
    };
  }, { maxWait: 15000, timeout: 60000 });
}
