import { createDatabase } from "../../../server/db.mjs";
import { createConfig } from "../../../server/config.mjs";
import { hashPassword, newId, normalizeIdentifier } from "../../../server/security.mjs";

const prisma = createDatabase();
const config = createConfig();

async function main() {
  const username = "naldrelle.student";
  const email = "naldrelle.student@cjc.edu.ph";
  const password = "Student1234!";

  const passwordHash = await hashPassword(
    password,
    config.scrypt
  );

  // Find Student role
  const studentRole = await prisma.role.findFirst({
    where: {
      name: "Student"
    }
  });

  // Find BSECE program
  const program = await prisma.program.findFirst({
    where:{
      code:"BSECE"
    }
  });


  const existingUser = await prisma.user.findUnique({
    where: { usernameNormalized: normalizeIdentifier(username) }
  });
  const user = existingUser ?? await prisma.user.create({
    data:{
      id: newId(),
      username,
      usernameNormalized: normalizeIdentifier(username),
      displayName: "Naldrelle Briones",
      email,
      emailNormalized: normalizeIdentifier(email),
      passwordHash,
      status:"ACTIVE",
      mustChangePassword: false,

      userRoles:{
        create:{
          roleId: studentRole.id,
          isPrimary:true
        }
      }
    }
  });


  await prisma.student.create({
    data:{
      userId:user.id,
      studentNumber:"2026-00001",
      studentNumberNormalized: normalizeIdentifier("2026-00001"),
      firstName:"Naldrelle",
      lastName:"Briones",
      admissionYear:2026,
      programId:program.id,
      currentYearLevel:1,
      status:"ACTIVE"
    }
  });


  console.log("Student created");
  console.log("Username:", username);
  console.log("Email:", email);
  console.log("Password:", password);

}


main()
.catch(console.error)
.finally(()=>prisma.$disconnect());
