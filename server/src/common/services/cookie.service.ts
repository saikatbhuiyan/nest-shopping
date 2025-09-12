import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CookieService {
  private readonly isProduction: boolean;
  private readonly accessTokenTtl: number;
  private readonly refreshTokenTtl: number;

  constructor(private readonly configService: ConfigService) {
    this.isProduction =
      this.configService.get<string>('environment') === 'production';
    this.accessTokenTtl =
      this.configService.get<number>('jwt.accessTokenTtl') * 1000; // ms
    this.refreshTokenTtl =
      this.configService.get<number>('jwt.refreshTokenTtl') * 1000; // ms
  }

  /**
   * Set per-device access token cookie
   */
  setAccessToken(res: Response, token: string, deviceId: string) {
    console.log(token, deviceId);
    res.cookie(`accessToken_${deviceId}`, token, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: this.isProduction ? 'strict' : 'lax',
      maxAge: this.accessTokenTtl,
    });
  }

  /**
   * Set per-device refresh token cookie
   */
  setRefreshToken(res: Response, token: string, deviceId: string) {
    res.cookie(`refreshToken_${deviceId}`, token, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: this.isProduction ? 'strict' : 'lax',
      maxAge: this.refreshTokenTtl,
    });
  }

  /**
   * Clear cookies for a specific device
   */
  clearAuthCookies(res: Response, deviceId: string) {
    res.clearCookie(`accessToken_${deviceId}`, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: this.isProduction ? 'strict' : 'lax',
    });
    res.clearCookie(`refreshToken_${deviceId}`, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: this.isProduction ? 'strict' : 'lax',
    });
  }
}
