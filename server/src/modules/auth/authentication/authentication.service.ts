import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../users/entities/user.entity';
import { Repository } from 'typeorm';
import { HashingService } from '../hashing/hashing.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ActiveUserData,
  RefreshTokenPayload,
} from '../interface/active-user-data-interface';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RefreshTokenIdsStorage } from './refresh-token-ids.storage';
import { randomUUID } from 'crypto';
import { PG_UNIQUE_VIOLATION_ERROR_CODE } from 'src/common/constants/app.constants';
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
  ) {}

  async signUp(signUpDto: SignUpDto) {
    const { email, password, ...others } = signUpDto;

    try {
      const existingUser = await this.usersRepository.findOne({
        where: { email },
      });

      if (existingUser) {
        throw new ConflictException('Email already registered');
      }

      const user = this.usersRepository.create({
        email,
        password: await this.hashingService.hash(password),
        ...others,
      });

      const savedUser = await this.usersRepository.save(user);
      return savedUser;
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === PG_UNIQUE_VIOLATION_ERROR_CODE
      ) {
        throw new ConflictException('Email already registered');
      }

      throw error;
    }
  }

  async signIn(signInDto: SignInDto) {
    const user = await this.usersRepository.findOneBy({
      email: signInDto.email,
    });
    if (!user) {
      throw new UnauthorizedException('User does not exists');
    }

    if (user.password) {
      const isEqual = await this.hashingService.compare(
        signInDto.password,
        user.password,
      );
      if (!isEqual) {
        throw new UnauthorizedException('Credentials not valid!');
      }
    }

    return await this.generateToken(user);
  }

  async generateToken(user: User) {
    const refreshTokenId = randomUUID();
    const [accessToken, refreshToken] = await Promise.all([
      this.signToken<Partial<ActiveUserData>>(
        user.id,
        this.configService.get('jwt.accessTokenTtl'),
        {
          email: user.email,
        },
      ),
      this.signToken<Partial<RefreshTokenPayload>>(
        user.id,
        this.configService.get('jwt.refreshTokenTtl'),
        { refreshTokenId },
      ),
    ]);
    console.log(user.id, refreshTokenId);
    await this.refreshTokenIdsStorage.insert(user.id, refreshTokenId);
    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(refreshTokenDto: RefreshTokenDto) {
    try {
      const { sub, refreshTokenId } = await this.jwtService.verifyAsync<
        Pick<RefreshTokenPayload, 'sub'> & { refreshTokenId: string }
      >(refreshTokenDto.refreshToken, {
        secret: this.configService.get('jwt.secret'),
        audience: this.configService.get('jwt.tokenAudience'),
        issuer: this.configService.get('jwt.tokenIssuer'),
      });

      const user = await this.usersRepository.findOneByOrFail({ id: sub });
      const isValid = await this.refreshTokenIdsStorage.validate(
        user.id,
        refreshTokenId,
      );
      if (!isValid) {
        throw new Error('Refresh token is invalid');
      }
      await this.refreshTokenIdsStorage.invalidate(user.id);
      return this.generateToken(user);
    } catch (error) {
      if (error instanceof InvalidateRefreshTokenError) {
        // Take action: notify user that the refresh token might have been stolen?
        throw new UnauthorizedException('Access denied');
      }
      throw new UnauthorizedException(error);
    }
  }

  async signToken<T extends object>(
    userId: number,
    expiresIn: number,
    payload?: T,
  ): Promise<string> {
    if (userId && expiresIn) {
      const audience = this.configService.get<string>('jwt.tokenAudience');
      const issuer = this.configService.getOrThrow<string>('jwt.tokenIssuer');
      const secret = this.configService.getOrThrow<string>('jwt.secret');
      return await this.jwtService.signAsync(
        {
          sub: userId,
          ...(payload ?? {}), // safe spread
        },
        {
          audience,
          issuer,
          secret,
          expiresIn,
        },
      );
    }

    // Handle the case where userId or expiresIn is falsy
    throw new Error('userId and expiresIn are required parameters');
  }
}
