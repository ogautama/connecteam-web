import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Google OAuth-only login means fixture users can't be created with a
// password anymore — instead this seeds PendingInvite rows keyed to real
// Google account emails you control, supplied via env vars (see
// .env.example). Each account completes its own public.User row via the
// on_auth_user_created trigger on first Google sign-in.
const LEADER_EMAIL = process.env.SEED_LEADER_EMAIL ?? "leader@example.com";
const AGENT1_EMAIL = process.env.SEED_AGENT1_EMAIL ?? "agent1@example.com";
const AGENT2_EMAIL = process.env.SEED_AGENT2_EMAIL ?? "agent2@example.com";

async function main() {
  // recruiterId/invitedBy reference a User.id, but none of these three
  // people has signed in yet — there's no real User row (and therefore no
  // id) to point at. All three seed as recruiterId/invitedBy = null (see
  // the nullability note on PendingInvite in schema.prisma); they land as
  // three independent root-level accounts, not a leader-with-two-agents
  // tree. Building that tree for real is Plan 02c's leader "Add Member"
  // flow, exercised once the leader fixture has signed in for real.
  await prisma.pendingInvite.upsert({
    where: { email: LEADER_EMAIL },
    update: {},
    create: { email: LEADER_EMAIL, role: "leader" },
  });

  await prisma.pendingInvite.upsert({
    where: { email: AGENT1_EMAIL },
    update: {},
    create: { email: AGENT1_EMAIL, role: "agent" },
  });

  await prisma.pendingInvite.upsert({
    where: { email: AGENT2_EMAIL },
    update: {},
    create: { email: AGENT2_EMAIL, role: "agent" },
  });

  console.log(
    `Seeded PendingInvite fixtures for ${LEADER_EMAIL} (leader), ${AGENT1_EMAIL}, ${AGENT2_EMAIL} (agents).\n` +
      "Sign in with Google using one of these addresses (each must also be on the " +
      "Google OAuth consent screen's test-user allowlist while it's in Testing mode) " +
      "to complete that account's profile via the on_auth_user_created trigger."
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
