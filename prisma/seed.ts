import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/lib/password";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Known test credentials for manual verification and PR-06's gating tests.
const TEST_PASSWORD = "Password123!";

async function main() {
  const passwordHash = await hashPassword(TEST_PASSWORD);

  // Fixture recruitment tree: root leader -> 2 mid agents -> 1 leaf agent.
  const root = await prisma.user.upsert({
    where: { email: "leader@connecteam.test" },
    update: {},
    create: {
      email: "leader@connecteam.test",
      name: "Root Leader",
      passwordHash,
      role: "leader",
      recruiterId: null,
    },
  });

  const mid1 = await prisma.user.upsert({
    where: { email: "agent1@connecteam.test" },
    update: {},
    create: {
      email: "agent1@connecteam.test",
      name: "Mid Agent One",
      passwordHash,
      role: "agent",
      recruiterId: root.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "agent2@connecteam.test" },
    update: {},
    create: {
      email: "agent2@connecteam.test",
      name: "Mid Agent Two",
      passwordHash,
      role: "agent",
      recruiterId: root.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "agent3@connecteam.test" },
    update: {},
    create: {
      email: "agent3@connecteam.test",
      name: "Leaf Agent",
      passwordHash,
      role: "agent",
      recruiterId: mid1.id,
    },
  });

  console.log(
    `Seeded fixture tree (leader@connecteam.test, agent1-3@connecteam.test). Password: ${TEST_PASSWORD}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
