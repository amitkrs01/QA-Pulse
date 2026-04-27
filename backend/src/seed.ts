import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@qapulse.com";
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!admin) {
    const passwordHash = await bcrypt.hash("admin123", 10);
    admin = await prisma.user.create({
      data: { name: "Admin", email: adminEmail, passwordHash, role: "ADMIN" },
    });
    console.log("Admin user created: admin@qapulse.com / admin123");
  } else {
    console.log("Admin user already exists.");
  }

  const aliceEmail = "alice@qapulse.com";
  let alice = await prisma.user.findUnique({ where: { email: aliceEmail } });
  if (!alice) {
    const ph = await bcrypt.hash("pass123", 10);
    alice = await prisma.user.create({
      data: { name: "Alice QA", email: aliceEmail, passwordHash: ph, role: "MEMBER" },
    });
    console.log("Alice user created: alice@qapulse.com / pass123");
  }

  let project = await prisma.project.findUnique({ where: { code: "DEMO" } });
  if (!project) {
    project = await prisma.project.create({
      data: { name: "Demo Project", code: "DEMO" },
    });
    console.log("Demo project created.");
  }

  const adminMember = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: project.id, userId: admin.id } },
  });
  if (!adminMember) {
    await prisma.projectMember.create({
      data: { projectId: project.id, userId: admin.id, role: "ADMIN" },
    });
  }
  if (alice) {
    const aliceMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: project.id, userId: alice.id } },
    });
    if (!aliceMember) {
      await prisma.projectMember.create({
        data: { projectId: project.id, userId: alice.id, role: "MEMBER" },
      });
    }
  }

  const moduleCount = await prisma.module.count({ where: { projectId: project.id } });
  if (moduleCount === 0) {
    const modules = ["User Authentication", "Payment Gateway", "User Profile", "Notifications", "Reports Module"];
    for (const name of modules) {
      await prisma.module.create({
        data: {
          name,
          projectId: project.id,
          beDetailedStatus: "NOT_STARTED",
          bePhase: "PREPARATION",
          feDetailedStatus: "NOT_STARTED",
          fePhase: "PREPARATION",
          overallPhase: "PREPARATION",
        },
      });
    }
    console.log("Demo modules created.");
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
