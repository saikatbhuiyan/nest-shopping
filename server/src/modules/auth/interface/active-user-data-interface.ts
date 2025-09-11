import { Request } from 'express';
import { Role } from '../../users/enums/role.enum';

export interface ActiveUserData {
  /**
   * The "subject" of the token. The value of this property is the user ID
   * that granted this token.
   **/
  sub: number;

  /**
   *  The subject's (user) email.
   **/
  email: string;

  /**
   *  The subject's (user) role.
   **/
  role?: Role;
}

export interface RefreshTokenPayload {
  /**
   * The "subject" of the token. The value of this property is the user ID
   * that granted this token.
   **/
  sub: number;

  /**
   *  The subject's (user) email.
   **/
  email: string;

  refreshTokenId: string;
}

export interface AuthenticatedRequest extends Request {
  user: ActiveUserData;
}
