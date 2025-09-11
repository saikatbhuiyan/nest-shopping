import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

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
  password?: string;

  @Column({ nullable: true })
  googleId?: string;
}
