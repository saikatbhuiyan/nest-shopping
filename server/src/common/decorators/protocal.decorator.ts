import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Protocol = createParamDecorator(
  (defaultValue: string, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    const protocol = req.protocol;
    return protocol || defaultValue;
  },
);
