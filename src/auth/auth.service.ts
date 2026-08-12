import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
// Imported via direct paths (not the `../account` barrel) to avoid a module-load
// cycle: the barrel re-exports AccountController, which imports guards from `../auth`.
import { AccountService } from '../account/account.service';
import { AccountResponseDto } from '../account/dto/account-response.dto';
import { NOTIFICATION_PORT, NotificationPort } from '../notifications';
import { RefreshTokenRepository } from './refresh-token.repository';
import { AccountTokenRepository } from './account-token.repository';
import { hashPassword, verifyPassword } from './password.util';
import { generateOpaqueToken, hashToken } from './token.util';
import { computeLockoutUntil } from './lockout.util';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { InvalidCredentialsException } from './exceptions/invalid-credentials.exception';
import { EmailAlreadyRegisteredException } from './exceptions/email-already-registered.exception';
import { InvalidOrExpiredTokenException } from './exceptions/invalid-or-expired-token.exception';

const ACCESS_TOKEN_TTL = '15m';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly accountService: AccountService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly accountTokenRepository: AccountTokenRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @Inject(NOTIFICATION_PORT) private readonly notificationPort: NotificationPort,
  ) {}

  async register(dto: RegisterDto): Promise<AccountResponseDto> {
    const passwordHash = await hashPassword(dto.password);

    let account;
    try {
      account = await this.accountService.createBuyer({ email: dto.email, passwordHash });
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        throw new EmailAlreadyRegisteredException();
      }
      throw err;
    }

    const verifyTtlHours = Number(this.config.get('EMAIL_VERIFICATION_TOKEN_TTL_HOURS') ?? 24);
    await this.issueAccountToken(
      account.id,
      'EMAIL_VERIFICATION',
      verifyTtlHours * 60 * 60 * 1000,
      (rawToken) =>
        this.notificationPort.sendEmailVerification({
          to: account.email,
          verifyUrl: `${this.config.get('FRONTEND_URL')}/verify-email?token=${rawToken}`,
        }),
    );

    return new AccountResponseDto(account);
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const account = await this.accountService.findByEmailForAuth(dto.email);

    if (!account || account.deletedAt || !account.passwordHash) {
      throw new InvalidCredentialsException();
    }

    if (account.lockedUntil && account.lockedUntil > new Date()) {
      throw new InvalidCredentialsException();
    }

    const valid = await verifyPassword(account.passwordHash, dto.password);
    if (!valid) {
      const lockedUntil = computeLockoutUntil(account.failedLoginCount + 1);
      await this.accountService.incrementFailedLogin(account.id, lockedUntil);
      throw new InvalidCredentialsException();
    }

    await this.accountService.resetFailedLogin(account.id);

    return this.issueTokens({ id: account.id, email: account.email, role: account.role });
  }

  async refresh(rawToken: string): Promise<AuthTokens> {
    const row = await this.refreshTokenRepository.findByHash(hashToken(rawToken));

    if (!row) {
      throw new UnauthorizedException();
    }

    if (row.revokedAt) {
      await this.refreshTokenRepository.revokeAllForAccount(row.accountId);
      throw new UnauthorizedException();
    }

    if (row.expiresAt < new Date()) {
      throw new UnauthorizedException();
    }

    await this.refreshTokenRepository.revoke(row.id);

    const account = await this.accountService.findById(row.accountId);
    if (!account) {
      throw new UnauthorizedException();
    }

    return this.issueTokens({ id: account.id, email: account.email, role: account.role });
  }

  async logout(rawToken: string): Promise<void> {
    const row = await this.refreshTokenRepository.findByHash(hashToken(rawToken));
    if (row) {
      await this.refreshTokenRepository.revoke(row.id);
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    const account = await this.accountService.findByEmail(email);
    if (!account || account.deletedAt) {
      return;
    }

    const resetTtlHours = Number(this.config.get('PASSWORD_RESET_TOKEN_TTL_HOURS') ?? 1);
    await this.issueAccountToken(account.id, 'PASSWORD_RESET', resetTtlHours * 60 * 60 * 1000, (rawToken) =>
      this.notificationPort.sendPasswordReset({
        to: account.email,
        resetUrl: `${this.config.get('FRONTEND_URL')}/reset-password?token=${rawToken}`,
      }),
    );
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const row = await this.accountTokenRepository.findValidByHash(hashToken(rawToken), 'PASSWORD_RESET');
    if (!row) {
      throw new InvalidOrExpiredTokenException();
    }

    const passwordHash = await hashPassword(newPassword);
    await this.accountService.setPasswordHash(row.accountId, passwordHash);
    await this.accountTokenRepository.markUsed(row.id);
    await this.refreshTokenRepository.revokeAllForAccount(row.accountId);
  }

  async verifyEmail(rawToken: string): Promise<void> {
    const row = await this.accountTokenRepository.findValidByHash(hashToken(rawToken), 'EMAIL_VERIFICATION');
    if (!row) {
      throw new InvalidOrExpiredTokenException();
    }

    await this.accountService.markEmailVerified(row.accountId);
    await this.accountTokenRepository.markUsed(row.id);
  }

  private async issueTokens(account: { id: string; email: string; role: string }): Promise<AuthTokens> {
    const accessToken = this.jwtService.sign(
      { sub: account.id, email: account.email, role: account.role },
      { secret: this.config.getOrThrow('JWT_SECRET'), expiresIn: ACCESS_TOKEN_TTL },
    );

    const refreshTtlDays = Number(this.config.get('REFRESH_TOKEN_TTL_DAYS') ?? 30);
    const rawRefreshToken = generateOpaqueToken();
    await this.refreshTokenRepository.create({
      accountId: account.id,
      tokenHash: hashToken(rawRefreshToken),
      expiresAt: new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000),
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  private async issueAccountToken(
    accountId: string,
    purpose: 'PASSWORD_RESET' | 'EMAIL_VERIFICATION',
    ttlMs: number,
    send: (rawToken: string) => Promise<void>,
  ): Promise<void> {
    const rawToken = generateOpaqueToken();
    await this.accountTokenRepository.create({
      accountId,
      purpose,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + ttlMs),
    });
    await send(rawToken);
  }
}
