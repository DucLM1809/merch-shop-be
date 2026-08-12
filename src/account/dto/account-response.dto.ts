import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class AccountResponseDto {
  @Expose() id!: string;
  @Expose() email!: string;
  @Expose() role!: string;
  @Expose() emailVerifiedAt!: Date | null;
  @Expose() createdAt!: Date;

  constructor(source: { id: string; email: string; role: string; emailVerifiedAt: Date | null; createdAt: Date }) {
    this.id = source.id;
    this.email = source.email;
    this.role = source.role;
    this.emailVerifiedAt = source.emailVerifiedAt;
    this.createdAt = source.createdAt;
  }
}
