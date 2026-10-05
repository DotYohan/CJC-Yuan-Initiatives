import { createDatabase } from "../server/db.mjs";
import { ProgramHeadStore } from "../server/program-head-store.mjs";

const db = createDatabase();
const store = new ProgramHeadStore(db);

async function main() {
  const phUser = await db.user.findFirst({
    where: { userRoles: { some: { role: { slug: "program_head" } } } }
  });

  console.log("Program Head user:", phUser.id, phUser.name, phUser.email);

  const review = await store.enrollmentApplicationReview(phUser.id, '3760041c-71af-4382-b61f-622b39834605');
  console.log("\nReview result:");
  console.log("canApprove:", review.canApprove);
  console.log("Application status:", review.application.status);
  console.log("Total units:", review.totalUnits, "/", review.maximumUnits);
  console.log("Items count:", review.items.length);
  console.log("Issues count:", review.issues.length);
  for (const i of review.issues) {
    console.log("Issue:", i);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
