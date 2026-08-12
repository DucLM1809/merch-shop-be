import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { NOTIFICATION_PORT } from '../../src/notifications/notification.port';

const mockNotifications = {
  sendOrderConfirmation: jest.fn(),
  sendPasswordReset: jest.fn(),
  sendEmailVerification: jest.fn(),
};

let app: INestApplication;
let prisma: PrismaService;

function extractToken(url: string): string {
  return new URL(url).searchParams.get('token')!;
}

async function cleanupByEmail(email: string) {
  await prisma.refreshToken.deleteMany({ where: { account: { email } } });
  await prisma.accountToken.deleteMany({ where: { account: { email } } });
  await prisma.account.deleteMany({ where: { email } });
}

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(NOTIFICATION_PORT)
    .useValue(mockNotifications)
    .compile();
  app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.setGlobalPrefix('api');
  await app.init();
  prisma = moduleRef.get(PrismaService);
});

afterAll(() => app.close());

// ─── Register → verify → login → refresh-rotation → reset → logout ───────────

describe('Auth lifecycle', () => {
  const email = `auth-lifecycle-${Date.now()}@example.com`;
  const password = 'correct-horse-battery-staple';
  const newPassword = 'a-brand-new-password-123';

  afterAll(() => cleanupByEmail(email));

  it('registers a new account and sends a verification email', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password })
      .expect(201);

    expect(body.data.email).toBe(email);
    expect(body.data.role).toBe('BUYER');
    expect(body.data.emailVerifiedAt).toBeNull();
    expect(body.data.passwordHash).toBeUndefined();
    expect(mockNotifications.sendEmailVerification).toHaveBeenCalledWith(expect.objectContaining({ to: email }));
  });

  it('rejects a duplicate registration', () =>
    request(app.getHttpServer()).post('/api/auth/register').send({ email, password }).expect(409));

  it('logs in and sets an HttpOnly, Strict, path-scoped refresh cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    expect(res.body.data.accessToken).toEqual(expect.any(String));
    const cookieHeader: string = res.headers['set-cookie'][0];
    expect(cookieHeader).toMatch(/refresh_token=/);
    expect(cookieHeader).toMatch(/HttpOnly/);
    expect(cookieHeader).toMatch(/SameSite=Strict/);
    expect(cookieHeader).toMatch(/Path=\/api\/auth/);
  });

  it('rotates the refresh token on /auth/refresh and rejects reuse of the old one', async () => {
    const login = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password }).expect(200);
    const originalCookie: string = login.headers['set-cookie'][0];

    const refreshed = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', originalCookie)
      .expect(200);
    expect(refreshed.body.data.accessToken).toEqual(expect.any(String));

    await request(app.getHttpServer()).post('/api/auth/refresh').set('Cookie', originalCookie).expect(401);
  });

  it('verifies the email using the token captured from the notification call', async () => {
    const verifyUrl = mockNotifications.sendEmailVerification.mock.calls[0][0].verifyUrl;
    const token = extractToken(verifyUrl);

    await request(app.getHttpServer()).post('/api/auth/verify-email').send({ token }).expect(200);

    const account = await prisma.account.findUnique({ where: { email } });
    expect(account?.emailVerifiedAt).not.toBeNull();
  });

  it('rejects reusing an already-consumed verification token', async () => {
    const verifyUrl = mockNotifications.sendEmailVerification.mock.calls[0][0].verifyUrl;
    const token = extractToken(verifyUrl);

    await request(app.getHttpServer()).post('/api/auth/verify-email').send({ token }).expect(400);
  });

  it('resets the password via forgot-password/reset-password and revokes existing sessions', async () => {
    const login = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password }).expect(200);
    const activeCookie: string = login.headers['set-cookie'][0];

    await request(app.getHttpServer()).post('/api/auth/forgot-password').send({ email }).expect(200);
    const resetUrl = mockNotifications.sendPasswordReset.mock.calls[0][0].resetUrl;
    const token = extractToken(resetUrl);

    await request(app.getHttpServer()).post('/api/auth/reset-password').send({ token, newPassword }).expect(200);

    // the session that was active before the reset is now revoked
    await request(app.getHttpServer()).post('/api/auth/refresh').set('Cookie', activeCookie).expect(401);
    // the new password works. (Not asserting the old password fails here —
    // that would trip the account-lockout backoff and could spuriously
    // reject the next test's login on this same account; wrong-password
    // rejection is covered thoroughly by the isolated-account backoff tests below.)
    await request(app.getHttpServer()).post('/api/auth/login').send({ email, password: newPassword }).expect(200);
  });

  it('forgot-password gives an identical response whether or not the account exists', async () => {
    const known = await request(app.getHttpServer()).post('/api/auth/forgot-password').send({ email }).expect(200);
    const unknown = await request(app.getHttpServer())
      .post('/api/auth/forgot-password')
      .send({ email: 'definitely-not-registered@example.com' })
      .expect(200);
    expect(known.body).toEqual(unknown.body);
  });

  it('logs out and revokes the refresh token', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: newPassword })
      .expect(200);
    const cookie: string = login.headers['set-cookie'][0];

    await request(app.getHttpServer()).post('/api/auth/logout').set('Cookie', cookie).expect(200);
    await request(app.getHttpServer()).post('/api/auth/refresh').set('Cookie', cookie).expect(401);
  });
});

// ─── Account lockout backoff — isolated account so it can't affect other tests ─

describe('Account lockout backoff', () => {
  const email = `auth-lockout-${Date.now()}@example.com`;
  const password = 'correct-horse-battery-staple';

  beforeAll(() =>
    request(app.getHttpServer()).post('/api/auth/register').send({ email, password }).expect(201),
  );

  afterAll(() => cleanupByEmail(email));

  it('rejects a wrong password generically and records a failed attempt', async () => {
    await request(app.getHttpServer()).post('/api/auth/login').send({ email, password: 'wrong-password' }).expect(401);

    const account = await prisma.account.findUnique({ where: { email } });
    expect(account?.failedLoginCount).toBe(1);
    expect(account?.lockedUntil).not.toBeNull();
  });

  it('rejects even the correct password while backed off, with the same generic error', () =>
    request(app.getHttpServer()).post('/api/auth/login').send({ email, password }).expect(401));
});

// ─── Guards: AuthGuard rejects a token for a soft-deleted account ─────────────

describe('AuthGuard rejects tokens for accounts that no longer exist or are soft-deleted', () => {
  const email = `auth-guard-${Date.now()}@example.com`;
  const password = 'correct-horse-battery-staple';

  afterAll(() => cleanupByEmail(email));

  it('401s /account/me once the account is soft-deleted mid-session', async () => {
    await request(app.getHttpServer()).post('/api/auth/register').send({ email, password }).expect(201);
    const login = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password }).expect(200);
    const accessToken: string = login.body.data.accessToken;

    await request(app.getHttpServer())
      .get('/api/account/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await prisma.account.update({ where: { email }, data: { deletedAt: new Date() } });

    await request(app.getHttpServer())
      .get('/api/account/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(401);
  });
});
