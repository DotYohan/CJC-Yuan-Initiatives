import 'dotenv/config';
import { createDatabase } from '../server/db.mjs';

const prisma = createDatabase();
async function main() {
  const users = await prisma.user.findMany({
    where: { userRoles: { some: { role: { slug: 'program_head' } } } },
    select: {
      id: true, email: true, username: true,
      userRoles: { include: { role: true } },
      programAssignments: { include: { program: true } }
    }
  });
  console.log("Program Head users:", JSON.stringify(users, null, 2));

  import('../server/enrollment-review.mjs').then(async ({ buildApplicationReview }) => {
    try {
      const review = await buildApplicationReview(prisma, '2831ebdf-717a-4775-8bb7-231f840bf37e', '736c0502-8016-4c26-9d64-1049afab4158');
      console.log("Review result:", JSON.stringify({
        applicationId: review.application.id,
        student: review.application.student,
        totalUnits: review.totalUnits,
        canApprove: review.canApprove,
        issues: review.issues,
        itemsCount: review.items.length
      }, null, 2));
    } catch (e) {
      console.error("buildApplicationReview failed:", e);
    }
    await prisma.$disconnect();
  });
}
main().catch(console.error);
