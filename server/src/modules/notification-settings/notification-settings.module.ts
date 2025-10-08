import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../database/entities/user.entity';
import { NotificationSettings } from '../../database/entities/notification-settings.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, NotificationSettings])],
})
export class NotificationSettingsModule {}
