import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('auth_audit')
export class AuthAudit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  userId: number | null; // null if user not found

  @Column({ type: 'varchar', length: 45 })
  ip: string;

  @Column({ type: 'varchar', length: 96, nullable: true })
  deviceId: string | null;

  @Column({ type: 'varchar', length: 64 })
  event: string; // e.g., 'sign_in', 'token_generated', 'sign_out'

  @Column({ type: 'boolean', default: false })
  success: boolean;

  @Column({ type: 'varchar', length: 64, nullable: true })
  refreshTokenId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  timestamp: Date;
}
