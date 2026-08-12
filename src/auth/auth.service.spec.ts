import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AccountService } from '../account';
import { RefreshTokenRepository } from './refresh-token.repository';
import { AccountTokenRepository } from './account-token.repository';
import { NOTIFICATION_PORT } from '../notifications';
import { EmailAlreadyRegisteredException } from './exceptions/email-already-registered.exception';
import { InvalidCredentialsException } from './exceptions/invalid-credentials.exception';
import { InvalidOrExpiredTokenException } from './exceptions/invalid-or-expired-token.exception';

describe('AuthService', () => {
  let service: AuthService;
  let accountService: {
    createBuyer: jest.Mock;
    findById: jest.Mock;
    findByEmailForAuth: jest.Mock;
    findByEmail: jest.Mock;
    incrementFailedLogin: jest.Mock;
    resetFailedLogin: jest.Mock;
    setPasswordHash: jest.Mock;
    markEmailVerified: jest.Mock;
  };
  let refreshTokenRepository: {
    create: jest.Mock;
    findByHash: jest.Mock;
    revoke: jest.Mock;
    revokeAllForAccount: jest.Mock;
  };
  let accountTokenRepository: { create: jest.Mock; findValidByHash: jest.Mock; markUsed: jest.Mock };
  let jwtService: { sign: jest.Mock };
  let notificationPort: { sendEmailVerification: jest.Mock; sendPasswordReset: jest.Mock };

  beforeEach(async () => {
    accountService = {
      createBuyer: jest.fn(),
      findById: jest.fn(),
      findByEmailForAuth: jest.fn(),
      findByEmail: jest.fn(),
      incrementFailedLogin: jest.fn(),
      resetFailedLogin: jest.fn(),
      setPasswordHash: jest.fn(),
      markEmailVerified: jest.fn(),
    };
    refreshTokenRepository = {
      create: jest.fn(),
      findByHash: jest.fn(),
      revoke: jest.fn(),
      revokeAllForAccount: jest.fn(),
    };
    accountTokenRepository = { create: jest.fn(), findValidByHash: jest.fn(), markUsed: jest.fn() };
    jwtService = { sign: jest.fn().mockReturnValue('signed.jwt.token') };
    notificationPort = { sendEmailVerification: jest.fn(), sendPasswordReset: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AccountService, useValue: accountService },
        { provide: RefreshTokenRepository, useValue: refreshTokenRepository },
        { provide: AccountTokenRepository, useValue: accountTokenRepository },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => 'http://localhost:3001'), getOrThrow: jest.fn(() => 'test-secret') },
        },
        { provide: NOTIFICATION_PORT, useValue: notificationPort },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('register', () => {
    it('creates a buyer account, issues a verification token, and returns the account without the password hash', async () => {
      const created = {
        id: 'acc_1',
        email: 'a@b.com',
        role: 'BUYER',
        emailVerifiedAt: null,
        createdAt: new Date(),
        passwordHash: 'hashed',
      };
      accountService.createBuyer.mockResolvedValue(created);

      const result = await service.register({ email: 'a@b.com', password: 'correct-horse-battery-staple' });

      expect(accountService.createBuyer).toHaveBeenCalledWith({
        email: 'a@b.com',
        passwordHash: expect.any(String),
      });
      expect(accountTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ accountId: 'acc_1', purpose: 'EMAIL_VERIFICATION' }),
      );
      expect(notificationPort.sendEmailVerification).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'a@b.com' }),
      );
      expect(result).toEqual(expect.objectContaining({ id: 'acc_1', email: 'a@b.com' }));
      expect((result as { passwordHash?: string }).passwordHash).toBeUndefined();
    });

    it('throws EmailAlreadyRegisteredException when the email is already taken', async () => {
      accountService.createBuyer.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.register({ email: 'a@b.com', password: 'correct-horse-battery-staple' }),
      ).rejects.toThrow(EmailAlreadyRegisteredException);
    });
  });

  describe('login', () => {
    const validAccount = {
      id: 'acc_1',
      email: 'a@b.com',
      role: 'BUYER',
      passwordHash: null as string | null,
      emailVerifiedAt: null,
      failedLoginCount: 0,
      lockedUntil: null as Date | null,
      deletedAt: null as Date | null,
    };

    it('issues an access and refresh token on a correct password', async () => {
      const { hashPassword } = jest.requireActual('./password.util');
      const passwordHash: string = await hashPassword('correct-horse-battery-staple');
      accountService.findByEmailForAuth.mockResolvedValue({ ...validAccount, passwordHash });

      const result = await service.login({ email: 'a@b.com', password: 'correct-horse-battery-staple' });

      expect(accountService.resetFailedLogin).toHaveBeenCalledWith('acc_1');
      expect(refreshTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ accountId: 'acc_1' }),
      );
      expect(result.accessToken).toBe('signed.jwt.token');
      expect(typeof result.refreshToken).toBe('string');
    });

    it('rejects an unknown email with a generic InvalidCredentialsException', async () => {
      accountService.findByEmailForAuth.mockResolvedValue(null);

      await expect(service.login({ email: 'nobody@b.com', password: 'whatever12345' })).rejects.toThrow(
        InvalidCredentialsException,
      );
    });

    it('rejects a wrong password and increments the failed-login counter', async () => {
      const { hashPassword } = jest.requireActual('./password.util');
      const passwordHash: string = await hashPassword('correct-horse-battery-staple');
      accountService.findByEmailForAuth.mockResolvedValue({ ...validAccount, passwordHash });

      await expect(service.login({ email: 'a@b.com', password: 'wrong-password' })).rejects.toThrow(
        InvalidCredentialsException,
      );
      expect(accountService.incrementFailedLogin).toHaveBeenCalledWith('acc_1', expect.any(Date));
    });

    it('rejects a backed-off account with the same generic error, without checking the password', async () => {
      const { hashPassword } = jest.requireActual('./password.util');
      const passwordHash: string = await hashPassword('correct-horse-battery-staple');
      accountService.findByEmailForAuth.mockResolvedValue({
        ...validAccount,
        passwordHash,
        lockedUntil: new Date(Date.now() + 60_000),
      });

      await expect(
        service.login({ email: 'a@b.com', password: 'correct-horse-battery-staple' }),
      ).rejects.toThrow(InvalidCredentialsException);
      expect(accountService.resetFailedLogin).not.toHaveBeenCalled();
    });

    it('rejects an account with no password hash yet (pre-migration) with the same generic error', async () => {
      accountService.findByEmailForAuth.mockResolvedValue({ ...validAccount, passwordHash: null });

      await expect(service.login({ email: 'a@b.com', password: 'whatever12345' })).rejects.toThrow(
        InvalidCredentialsException,
      );
    });

    it('rejects a soft-deleted account with the same generic error', async () => {
      const { hashPassword } = jest.requireActual('./password.util');
      const passwordHash: string = await hashPassword('correct-horse-battery-staple');
      accountService.findByEmailForAuth.mockResolvedValue({
        ...validAccount,
        passwordHash,
        deletedAt: new Date(),
      });

      await expect(
        service.login({ email: 'a@b.com', password: 'correct-horse-battery-staple' }),
      ).rejects.toThrow(InvalidCredentialsException);
    });
  });

  describe('refresh', () => {
    it('rotates the refresh token and issues a new access token', async () => {
      refreshTokenRepository.findByHash.mockResolvedValue({
        id: 'rt_1',
        accountId: 'acc_1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      });
      accountService.findById.mockResolvedValue({ id: 'acc_1', email: 'a@b.com', role: 'BUYER' });

      const result = await service.refresh('some-raw-refresh-token');

      expect(refreshTokenRepository.revoke).toHaveBeenCalledWith('rt_1');
      expect(refreshTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ accountId: 'acc_1' }),
      );
      expect(result.accessToken).toBe('signed.jwt.token');
    });

    it('rejects an unknown token', async () => {
      refreshTokenRepository.findByHash.mockResolvedValue(null);

      await expect(service.refresh('unknown-token')).rejects.toThrow(UnauthorizedException);
    });

    it('treats reuse of an already-revoked token as theft and revokes every session for the account', async () => {
      refreshTokenRepository.findByHash.mockResolvedValue({
        id: 'rt_1',
        accountId: 'acc_1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(service.refresh('reused-token')).rejects.toThrow(UnauthorizedException);
      expect(refreshTokenRepository.revokeAllForAccount).toHaveBeenCalledWith('acc_1');
    });

    it('rejects an expired token', async () => {
      refreshTokenRepository.findByHash.mockResolvedValue({
        id: 'rt_1',
        accountId: 'acc_1',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 60_000),
      });

      await expect(service.refresh('expired-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('revokes the presented refresh token', async () => {
      refreshTokenRepository.findByHash.mockResolvedValue({ id: 'rt_1' });

      await service.logout('some-raw-refresh-token');

      expect(refreshTokenRepository.revoke).toHaveBeenCalledWith('rt_1');
    });

    it('is a no-op when the token is unknown', async () => {
      refreshTokenRepository.findByHash.mockResolvedValue(null);

      await expect(service.logout('unknown-token')).resolves.toBeUndefined();
      expect(refreshTokenRepository.revoke).not.toHaveBeenCalled();
    });
  });

  describe('requestPasswordReset', () => {
    it('issues a reset token and sends an email when the account exists', async () => {
      accountService.findByEmail.mockResolvedValue({ id: 'acc_1', email: 'a@b.com', deletedAt: null });

      await service.requestPasswordReset('a@b.com');

      expect(accountTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ accountId: 'acc_1', purpose: 'PASSWORD_RESET' }),
      );
      expect(notificationPort.sendPasswordReset).toHaveBeenCalledWith(expect.objectContaining({ to: 'a@b.com' }));
    });

    it('does nothing but does not throw when the account does not exist', async () => {
      accountService.findByEmail.mockResolvedValue(null);

      await expect(service.requestPasswordReset('nobody@b.com')).resolves.toBeUndefined();
      expect(accountTokenRepository.create).not.toHaveBeenCalled();
      expect(notificationPort.sendPasswordReset).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('sets the new password, consumes the token, and revokes all existing sessions', async () => {
      accountTokenRepository.findValidByHash.mockResolvedValue({ id: 'tok_1', accountId: 'acc_1' });

      await service.resetPassword('some-raw-token', 'brand-new-password-123');

      expect(accountService.setPasswordHash).toHaveBeenCalledWith('acc_1', expect.any(String));
      expect(accountTokenRepository.markUsed).toHaveBeenCalledWith('tok_1');
      expect(refreshTokenRepository.revokeAllForAccount).toHaveBeenCalledWith('acc_1');
    });

    it('throws InvalidOrExpiredTokenException for an invalid or expired token', async () => {
      accountTokenRepository.findValidByHash.mockResolvedValue(null);

      await expect(service.resetPassword('bad-token', 'brand-new-password-123')).rejects.toThrow(
        InvalidOrExpiredTokenException,
      );
    });
  });

  describe('verifyEmail', () => {
    it('marks the account as verified and consumes the token', async () => {
      accountTokenRepository.findValidByHash.mockResolvedValue({ id: 'tok_1', accountId: 'acc_1' });

      await service.verifyEmail('some-raw-token');

      expect(accountService.markEmailVerified).toHaveBeenCalledWith('acc_1');
      expect(accountTokenRepository.markUsed).toHaveBeenCalledWith('tok_1');
    });

    it('throws InvalidOrExpiredTokenException for an invalid or expired token', async () => {
      accountTokenRepository.findValidByHash.mockResolvedValue(null);

      await expect(service.verifyEmail('bad-token')).rejects.toThrow(InvalidOrExpiredTokenException);
    });
  });
});
