import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryColumn({ type: 'bigint' })
  id!: string;

  @Column({ unique: true, length: 100 })
  username!: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash!: string;

  @Column({ unique: true, length: 255 })
  email!: string;

  @Column({ name: 'full_name', length: 255 })
  fullName!: string;

  @Column({ name: 'phone_number', length: 20, nullable: true })
  phoneNumber?: string;

  @Column({ length: 20, default: 'ACTIVE' })
  status!: string;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @Column({ name: 'department_id', type: 'int', nullable: true })
  departmentId?: number;

  @Column({ name: 'facility_id', type: 'int', nullable: true })
  facilityId?: number;

  @Column({ name: 'refresh_token', length: 500, nullable: true })
  refreshToken?: string;
}
