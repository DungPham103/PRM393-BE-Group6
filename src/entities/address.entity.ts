import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('addresses')
export class Address {
  @PrimaryGeneratedColumn('uuid', { name: 'address_id' })
  addressId: string;

  @Column({ name: 'uid' })
  uid: string;

  @ManyToOne(() => User, (user) => user.addresses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'uid' })
  user: User;

  @Column({ name: 'recipient_name', length: 100 })
  recipientName: string;

  @Column({ length: 20 })
  phone: string;

  @Column({ length: 255 })
  street: string;

  @Column({ length: 100, nullable: true })
  ward: string;

  @Column({ length: 100 })
  district: string;

  @Column({ length: 100, default: 'TP. Hồ Chí Minh' })
  city: string;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
