import {
  Controller,
  Post,
  Res,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Public } from 'src/common/decorators/public.decorator';
import { AuthenticationService } from './authentication.service';
import { CookieService } from 'src/common/services/cookie.service';
import { SignInDto } from './dto/sign-in.dto';
import { SignOutDto } from './dto/sign-out.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import type { Request, Response } from 'express';
import { ClientType } from './enums/cient-type.enum';
import { RateLimit } from 'src/common/decorators/rate-limit.decorator';
import { RateLimitGuard } from 'src/common/guards/rate-limit.guard';

@UseGuards(RateLimitGuard)
@Controller('authentication')
export class AuthenticationController {
  constructor(
    private readonly authService: AuthenticationService,
    private readonly cookieService: CookieService,
  ) {}

  @Public()
  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  @RateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many attempts, try again later',
  })
  async signIn(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() signInDto: SignInDto,
  ) {
    const { deviceId, clientType = ClientType.WEB } = signInDto;
    const ip = req.ip;

    const { accessToken, refreshToken } = await this.authService.signIn(
      signInDto,
      ip,
    );

    if (clientType === ClientType.WEB) {
      this.cookieService.setAccessToken(res, accessToken, deviceId);
      this.cookieService.setRefreshToken(res, refreshToken, deviceId);
      return { message: 'Sign-in successful' };
    }

    return {
      accessToken,
      refreshToken,
      deviceId,
      message: 'Sign-in successful',
    };
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() refreshTokenDto: RefreshTokenDto,
  ) {
    const { deviceId, clientType = ClientType.WEB } = refreshTokenDto;

    const refreshToken =
      clientType === ClientType.WEB
        ? (req.cookies[`refreshToken_${deviceId}`] as string)
        : refreshTokenDto.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await this.authService.refreshTokens({ refreshToken, deviceId });

    if (clientType === ClientType.WEB) {
      this.cookieService.setAccessToken(res, accessToken, deviceId);
      this.cookieService.setRefreshToken(res, newRefreshToken, deviceId);
      return { message: 'Tokens refreshed successfully' };
    }

    return {
      accessToken,
      refreshToken: newRefreshToken,
      deviceId,
      message: 'Tokens refreshed successfully',
    };
  }

  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  @RateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many attempts, try again later',
  })
  async signOut(
    @Res({ passthrough: true }) res: Response,
    @Body() signOutDto: SignOutDto,
  ) {
    const { deviceId, clientType = ClientType.WEB } = signOutDto;

    if (clientType === ClientType.WEB) {
      this.cookieService.clearAuthCookies(res, deviceId);
    }

    await this.authService.signOut(signOutDto);
    return { message: 'Signed out successfully' };
  }
}
