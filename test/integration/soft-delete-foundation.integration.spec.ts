import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PublishersRepository } from '../../src/catalog/publishers/publishers.repository';

let app: INestApplication;
let prisma: PrismaService;
let publishersRepo: PublishersRepository;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.setGlobalPrefix('api');
  await app.init();
  prisma = moduleRef.get(PrismaService);
  publishersRepo = moduleRef.get(PublishersRepository, { strict: false });
});

afterAll(() => app.close());

describe('BaseRepository.softRemove', () => {
  it('marks entity as deleted without removing the row', async () => {
    const publisher = await prisma.publisher.create({
      data: { name: 'Soft Delete Test Publisher', slug: 'sd-foundation-test' },
    });

    const result = await publishersRepo.softRemove(publisher.id);

    expect(result.deletedAt).not.toBeNull();
    const row = await prisma.publisher.findUnique({ where: { id: publisher.id } });
    expect(row).not.toBeNull();
    expect(row!.deletedAt).not.toBeNull();

    await prisma.publisher.delete({ where: { id: publisher.id } });
  });
});
