import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import {
  ActiveUserData,
  AuthenticatedRequest,
} from 'src/modules/auth/interface/active-user-data-interface';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);
    console.log('token', token);
    console.log(
      'request.headers.authorization AccessTokenGuard',
      request.headers,
    );
    console.log(
      'request.headers.authorization',
      this.configService.get('jwt.secret'),
      token,
      'should match the secret',
    );

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const payload: ActiveUserData = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('jwt.secret'),
      });
      console.log('payload', payload);
      request.user = payload;
      console.log('payload', payload);
    } catch (error) {
      console.error('Error verifying token', error);
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [, token] = request.headers.authorization?.split(' ') ?? [];
    return token;
  }
}
