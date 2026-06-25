import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

let app: INestApplication;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.setGlobalPrefix('api');
  const doc = SwaggerModule.createDocument(app, new DocumentBuilder().build());
  SwaggerModule.setup('api/docs', app, doc);
  await app.init();
});

afterAll(() => app.close());

describe('GET /api/publishers', () => {
  it('returns 200 with empty array on fresh DB', () =>
    request(app.getHttpServer()).get('/api/publishers').expect(200).expect([]));
});

describe('GET /api/docs', () => {
  it('returns 200', () =>
    request(app.getHttpServer()).get('/api/docs').expect(200));
});
