import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { HashingService } from '../hashing/hashing.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { RefreshTokenIdsStorage } from './refresh-token-ids.storage';
import { RefreshTokenBlacklist } from './refresh-token-black-list.storage';
import { AuthAuditService } from './auth-audit.service';
import { SignInDto } from './dto/sign-in.dto';
import { SignOutDto } from './dto/sign-out.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Role } from 'src/modules/users/enums/role.enum';
import { InvalidateRefreshTokenError } from 'src/common/errors/extend.error';

@Injectable()
export class AuthenticationService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly hashingService: HashingService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly refreshTokenIdsStorage: RefreshTokenIdsStorage,
    private readonly refreshTokenBlacklist: RefreshTokenBlacklist,
    private readonly auditService: AuthAuditService,
  ) {}

  /**
   * Sign in user with password validation
   */
  async signIn(signInDto: SignInDto, ip?: string) {
    const { email, password, deviceId } = signInDto;

    const user = await this.usersRepository.findOneBy({ email });
    if (!user) throw new UnauthorizedException('User does not exist');

    // Password validation
    if (user.password) {
      const isValid = await this.hashingService.compare(
        password,
        user.password,
      );
      if (!isValid) {
        await this.auditService.logSignInAttempt(null, ip, deviceId, false);
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    const tokens = await this.generateTokens(user, deviceId, ip);

    // await this.auditService.logSignInAttempt(user.id, ip, deviceId, true);
    return tokens;
  }

  /**
   * Generate access + refresh tokens (per-device)
   */
  async generateTokens(user: User, deviceId: string, ip?: string) {
    const refreshTokenId = randomUUID();

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { id: user.id, email: user.email, roles: [Role.Admin] },
        {
          secret: this.configService.get<string>('jwt.secret'),
          expiresIn: this.configService.get<number>('jwt.accessTokenTtl'),
        },
      ),
      this.jwtService.signAsync(
        { refreshTokenId, deviceId },
        {
          secret: this.configService.get<string>('jwt.secret'),
          expiresIn: this.configService.get<number>('jwt.refreshTokenTtl'),
        },
      ),
    ]);

    // Store refresh token in Redis (per-device)
    await this.refreshTokenIdsStorage.insert(user.id, refreshTokenId, deviceId);

    // Audit log
    await this.auditService.logTokenGeneration(
      user.id,
      deviceId,
      refreshTokenId,
      ip,
    );

    return { accessToken, refreshToken };
  }

  /**
   * Refresh tokens (per-device rotation + blacklist)
   */
  async refreshTokens(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken, deviceId } = refreshTokenDto;

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: number;
        refreshTokenId: string;
        deviceId: string;
      }>(refreshToken, {
        secret: this.configService.get('jwt.secret'),
        audience: this.configService.get('jwt.tokenAudience'),
        issuer: this.configService.get('jwt.tokenIssuer'),
      });

      // Check if token is blacklisted
      if (
        await this.refreshTokenBlacklist.isBlacklisted(payload.refreshTokenId)
      ) {
        throw new UnauthorizedException('Refresh token has been revoked');
      }

      // Validate token in Redis (per-device)
      const user = await this.usersRepository.findOneByOrFail({
        id: payload.sub,
      });
      const isValid = await this.refreshTokenIdsStorage.validate(
        user.id,
        payload.refreshTokenId,
        deviceId,
      );
      if (!isValid) throw new InvalidateRefreshTokenError();

      // Invalidate old refresh token
      await this.refreshTokenIdsStorage.invalidate(user.id, deviceId);
      await this.refreshTokenBlacklist.blacklistToken(payload.refreshTokenId);

      // Generate new tokens
      return this.generateTokens(user, deviceId);
    } catch (error) {
      if (error instanceof InvalidateRefreshTokenError) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      throw new UnauthorizedException(error || 'Unauthorized');
    }
  }

  /**
   * Sign out (per-device)
   */
  async signOut(signOutDto: SignOutDto) {
    const { userId, deviceId } = signOutDto;
    const refreshTokenId = await this.refreshTokenIdsStorage.getToken(
      userId,
      deviceId,
    );
    await this.refreshTokenIdsStorage.invalidate(userId, deviceId);
    // Optional: blacklist the current refresh token to prevent reuse
    await this.refreshTokenBlacklist.blacklistToken(refreshTokenId);
  }
}
