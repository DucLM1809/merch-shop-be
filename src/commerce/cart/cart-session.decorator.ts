import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthUser } from '../../auth';

export interface CartSessionContext {
  type: 'guest' | 'account';
  id: string;
  email?: string;
}

export const CartSession = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CartSessionContext => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();

    if (req.user) return { type: 'account', id: req.user.userId, email: req.user.email };

    let sessionId = req.cookies?.['cart_session'] as string | undefined;
    if (!sessionId) {
      sessionId = uuidv4();
      req.res?.cookie('cart_session', sessionId, { httpOnly: true, sameSite: 'lax' });
    }
    return { type: 'guest', id: sessionId };
  },
);
