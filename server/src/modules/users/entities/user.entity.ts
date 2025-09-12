import { Exclude } from 'class-transformer';
import { NotificationSettings } from 'src/modules/notification-settings/entities/notification-settings.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  OneToOne,
} from 'typeorm';

@Entity('users')
@Unique(['email'])
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 96 })
  firstName: string;

  @Column({ length: 96, nullable: true })
  lastName?: string;

  @Column({ length: 96 })
  email: string;

  @Column({ length: 96, nullable: true })
  @Exclude()
  password?: string;

  @Column({ nullable: true })
  @Exclude()
  googleId?: string;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @Column({ nullable: true })
  lastLoginIp: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isLocked: boolean;

  @OneToOne(() => NotificationSettings, (settings) => settings.user)
  notificationSettings: NotificationSettings;
}
