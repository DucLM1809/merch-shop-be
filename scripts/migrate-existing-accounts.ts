/**
 * One-off cutover script for the Clerk -> self-owned-auth migration.
 *
 * Every pre-cutover account has `passwordHash IS NULL` (new registrations
 * always set it), so this finds exactly those accounts and proactively
 * emails each one a password-reset link. Run once at deploy time:
 *
 *   npm run migrate:existing-accounts
 */
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma';
import { NOTIFICATION_PORT, NotificationPort } from '../src/notifications';
import { AccountTokenRepository } from '../src/auth/account-token.repository';
import { generateOpaqueToken, hashToken } from '../src/auth/token.util';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const prisma = app.get(PrismaService);
    const accountTokenRepository = app.get(AccountTokenRepository);
    const notificationPort = app.get<NotificationPort>(NOTIFICATION_PORT);
    const config = app.get(ConfigService);

    const frontendUrl = config.get('FRONTEND_URL');
    const resetTtlHours = Number(config.get('PASSWORD_RESET_TOKEN_TTL_HOURS') ?? 1);

    const accounts = await prisma.account.findMany({
      where: { passwordHash: null, deletedAt: null },
      select: { id: true, email: true },
    });

    console.log(`Found ${accounts.length} pre-cutover account(s) needing a password reset email.`);

    for (const account of accounts) {
      const rawToken = generateOpaqueToken();
      await accountTokenRepository.create({
        accountId: account.id,
        purpose: 'PASSWORD_RESET',
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + resetTtlHours * 60 * 60 * 1000),
      });
      await notificationPort.sendPasswordReset({
        to: account.email,
        resetUrl: `${frontendUrl}/reset-password?token=${rawToken}`,
      });
      console.log(`Queued reset email for ${account.email}`);
    }

    console.log('Done.');
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
