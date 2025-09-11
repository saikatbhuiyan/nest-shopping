import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { ROLES_KEY } from '../../decorators/roles.decorator';
import { Role } from '../../../../users/enums/role.enum';
import {
  ActiveUserData,
  AuthenticatedRequest,
} from 'src/modules/auth/interface/active-user-data-interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const contextRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!contextRoles) {
      return true;
    }

    const user: ActiveUserData = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>().user;

    return contextRoles.some((role) => user.role.includes(role));
  }
}
