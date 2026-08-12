import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth/password.util';

const MIN_PASSWORD_LENGTH = 12;

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set to seed the first admin account.');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  const prisma = new PrismaClient();
  const passwordHash = await hashPassword(password);

  // Idempotent: no-ops if the email already exists, so this is safe to re-run.
  await prisma.account.upsert({
    where: { email },
    create: { email, passwordHash, role: 'ADMIN', emailVerifiedAt: new Date() },
    update: {},
  });

  console.log(`Admin account ready: ${email}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
