import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { NotificationSettings } from './entities/notification-settings.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, NotificationSettings])],
})
export class NotificationSettingsModule {}
