import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class UpdateUsersAddLoginAndNotificationSettings1757697856274
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('users', [
      new TableColumn({
        name: 'lastLoginAt',
        type: 'timestamp',
        isNullable: true,
      }),
      new TableColumn({
        name: 'lastLoginIp',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'isActive',
        type: 'boolean',
        default: true,
      }),
      new TableColumn({
        name: 'isLocked',
        type: 'boolean',
        default: false,
      }),
    ]);

    // Relation column for NotificationSettings (OneToOne)
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'notificationSettingsId',
        type: 'int',
        isNullable: true,
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'users',
      new TableForeignKey({
        columnNames: ['notificationSettingsId'],
        referencedTableName: 'notification_settings',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('user');

    const foreignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('notificationSettingsId') !== -1,
    );

    if (foreignKey) {
      await queryRunner.dropForeignKey('user', foreignKey);
    }

    await queryRunner.dropColumn('user', 'notificationSettingsId');

    await queryRunner.dropColumn('user', 'isLocked');
    await queryRunner.dropColumn('user', 'isActive');
    await queryRunner.dropColumn('user', 'lastLoginIp');
    await queryRunner.dropColumn('user', 'lastLoginAt');
  }
}
