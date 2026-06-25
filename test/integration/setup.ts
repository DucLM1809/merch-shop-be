import { execSync } from 'child_process';

export default async function globalSetup() {
  process.env.DATABASE_URL =
    'postgresql://postgres:postgres@localhost:5433/merch_shop_test';

  execSync('npx prisma migrate deploy', {
    env: { ...process.env },
    stdio: 'inherit',
  });
}
