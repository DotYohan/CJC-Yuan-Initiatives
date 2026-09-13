import { pathToFileURL } from "node:url";
import { createDatabase } from "../../../server/db.mjs";
import { newId } from "../../../server/security.mjs";

const shouldCommit = process.argv.includes("--commit");

function readExplicitAssignments(environment = process.env) {
  const raw = environment.PROGRAM_HEAD_ASSIGNMENT_MAP;
  if (!raw) return {};

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('PROGRAM_HEAD_ASSIGNMENT_MAP must be JSON in the form {"username":"PROGRAM_CODE"}.');
  }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error('PROGRAM_HEAD_ASSIGNMENT_MAP must be JSON in the form {"username":"PROGRAM_CODE"}.');
  }
  return parsed;
}

export async function repairProgramHeadAssignments(prisma, options = {}) {
  const explicitAssignments = options.assignments ?? readExplicitAssignments(options.environment);
  const commit = options.commit ?? shouldCommit;

  console.log("\nScanning for Program Head accounts without assignments...\n");

  const programHeadRole = await prisma.role.findUnique({ where: { slug: "program_head" } });
  if (!programHeadRole) throw new Error("Program Head role not found in database. Run the security seed first.");

  const programHeadsWithoutAssignment = await prisma.user.findMany({
    where: {
      userRoles: { some: { roleId: programHeadRole.id } },
      programAssignments: { none: {} }
    },
    select: { id: true, username: true, displayName: true },
    orderBy: { username: "asc" }
  });

  if (programHeadsWithoutAssignment.length === 0) {
    console.log("All Program Head accounts already have direct Program assignments.\n");
    return { repaired: 0, skipped: 0, planned: 0 };
  }

  console.log(`Found ${programHeadsWithoutAssignment.length} unassigned Program Head account(s):`);
  for (const user of programHeadsWithoutAssignment) console.log(`  - ${user.displayName} (@${user.username})`);

  const programs = await prisma.program.findMany({
    where: {
      isActive: true,
      department: { is: { isActive: true, college: { is: { isActive: true } } } }
    },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" }
  });
  if (programs.length === 0) {
    console.log("No active Program in an active Department and College is available.\n");
    return { repaired: 0, skipped: programHeadsWithoutAssignment.length, planned: 0 };
  }

  console.log("\nAvailable Programs:");
  for (const program of programs) console.log(`  - ${program.code}: ${program.name} (${program.id})`);

  const usersByUsername = new Map(programHeadsWithoutAssignment.map((user) => [user.username, user]));
  const programsByCode = new Map(programs.map((program) => [program.code.toUpperCase(), program]));
  const unknownUsers = Object.keys(explicitAssignments).filter((username) => !usersByUsername.has(username));
  if (unknownUsers.length > 0) {
    throw new Error(`Assignment map contains unknown or already-assigned users: ${unknownUsers.join(", ")}`);
  }

  const repairs = [];
  for (const user of programHeadsWithoutAssignment) {
    const requestedCode = explicitAssignments[user.username];
    if (!requestedCode) {
      console.log(`No explicit mapping for @${user.username}; skipped.`);
      continue;
    }
    const program = programsByCode.get(String(requestedCode).trim().toUpperCase());
    if (!program) throw new Error(`Program ${requestedCode} is not active or does not exist for @${user.username}.`);
    repairs.push({ user, program });
  }

  if (repairs.length === 0) {
    console.log('\nNo assignments are planned. Set PROGRAM_HEAD_ASSIGNMENT_MAP to JSON such as {"username":"BSECE"}.\n');
    return { repaired: 0, skipped: programHeadsWithoutAssignment.length, planned: 0 };
  }

  console.log(`\nReviewed assignment plan (${repairs.length}):`);
  for (const { user, program } of repairs) console.log(`  - @${user.username} -> ${program.code} (${program.id})`);

  if (!commit) {
    console.log("\nDRY RUN: add --commit only after the explicit mapping has been reviewed.\n");
    return { repaired: 0, skipped: programHeadsWithoutAssignment.length - repairs.length, planned: repairs.length };
  }

  const now = new Date();
  let repaired = 0;
  for (const { user, program } of repairs) {
    await prisma.userProgramAssignment.create({
      data: {
        id: newId(),
        userId: user.id,
        programId: program.id,
        assignedByUserId: null,
        createdAt: now
      }
    });
    console.log(`Assigned @${user.username} to ${program.code}.`);
    repaired += 1;
  }

  console.log(`\nRepaired ${repaired} explicit assignment(s).\n`);
  return { repaired, skipped: programHeadsWithoutAssignment.length - repaired, planned: repairs.length };
}

async function runCli() {
  const prisma = createDatabase();
  try {
    const result = await repairProgramHeadAssignments(prisma);
    process.exitCode = result.repaired > 0 || result.planned > 0 ? 0 : 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runCli();
}

export default repairProgramHeadAssignments;
