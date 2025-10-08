import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuthAudit } from '../../../database/entities/auth-audit.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class AuthAuditService {
  constructor(
    @InjectRepository(AuthAudit)
    private readonly auditRepository: Repository<AuthAudit>,
  ) {}

  async logSignInAttempt(
    userId: number | null,
    ip: string,
    deviceId: string,
    success: boolean,
  ) {
    await this.auditRepository.save({
      userId,
      ip,
      deviceId,
      success,
      event: 'sign_in',
      timestamp: new Date(),
    });
  }

  async logTokenGeneration(
    userId: number,
    deviceId: string,
    refreshTokenId: string,
    ip?: string,
  ) {
    await this.auditRepository.save({
      userId,
      deviceId,
      refreshTokenId,
      ip,
      event: 'token_generated',
      timestamp: new Date(),
    });
  }
}
