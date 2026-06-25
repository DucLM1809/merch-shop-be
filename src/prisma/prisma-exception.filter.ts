import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Response } from 'express';

@Catch(PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: PrismaClientKnownRequestError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (exception.code === 'P2025') {
      res.status(404).json({ statusCode: 404, message: 'Not found', error: 'Not Found' });
    } else {
      res.status(500).json({ statusCode: 500, message: 'Internal server error', error: 'Internal Server Error' });
    }
  }
}
