import { Injectable } from '@nestjs/common';
import { AccountRepository } from './account.repository';

@Injectable()
export class AccountService {
  constructor(private readonly accountRepository: AccountRepository) {}

  findById(id: string) {
    return this.accountRepository.findById(id);
  }

  findByEmail(email: string) {
    return this.accountRepository.findByEmail(email);
  }

  findByEmailForAuth(email: string) {
    return this.accountRepository.findByEmailForAuth(email);
  }

  createBuyer(data: { email: string; passwordHash: string }) {
    return this.accountRepository.createBuyer(data);
  }

  incrementFailedLogin(id: string, lockedUntil: Date | null) {
    return this.accountRepository.incrementFailedLogin(id, lockedUntil);
  }

  resetFailedLogin(id: string) {
    return this.accountRepository.resetFailedLogin(id);
  }

  markEmailVerified(id: string) {
    return this.accountRepository.markEmailVerified(id);
  }

  setPasswordHash(id: string, passwordHash: string) {
    return this.accountRepository.setPasswordHash(id, passwordHash);
  }

  remove(id: string) {
    return this.accountRepository.softRemove(id);
  }
}
