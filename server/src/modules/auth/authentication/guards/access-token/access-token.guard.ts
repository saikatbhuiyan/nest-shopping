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

    // Try extracting token from Authorization header (mobile clients)
    let token = this.extractTokenFromHeader(request);

    // If no header token → try cookies (web clients, per-device session)
    if (!token) {
      // Prefer deviceId from headers for consistency
      const deviceId: string = this.extractDeviceId(request);

      if (!deviceId) {
        throw new UnauthorizedException(
          'Device ID missing for web authentication',
        );
      }

      token = request.cookies?.[`accessToken_${deviceId}`] as string;
    }

    console.log(request.cookies);

    if (!token) {
      throw new UnauthorizedException('Access token missing');
    }

    try {
      const payload: ActiveUserData = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      request.user = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException(error, 'Invalid or expired access token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) return undefined;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }

  private extractDeviceId(req: Request): string | undefined {
    if (typeof req.headers['x-device-id'] === 'string') {
      return req.headers['x-device-id'];
    }

    if (
      req.body &&
      typeof (req.body as Record<string, unknown>).deviceId === 'string'
    ) {
      return (req.body as Record<string, string>).deviceId;
    }

    if (
      req.query &&
      typeof (req.query as Record<string, unknown>).deviceId === 'string'
    ) {
      return (req.query as Record<string, string>).deviceId;
    }

    return undefined;
  }
}
