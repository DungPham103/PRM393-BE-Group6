import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Address } from './address.entity';
import { Cart } from './cart.entity';
import { Order } from './order.entity';
import { Notification } from './notification.entity';
import { Message } from './message.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  uid: string;

  @Column({ name: 'full_name', length: 100 })
  fullName: string;

  @Column({ unique: true, length: 150 })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl: string;

  @Column({ type: 'text', default: 'customer' })
  role: 'customer' | 'admin';

  @Column({ name: 'default_address_id', nullable: true })
  defaultAddressId: string;

  @ManyToOne(() => Address, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'default_address_id' })
  defaultAddress: Address;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'otp_code', type: 'varchar', length: 10, nullable: true })
  otpCode: string | null;

  @Column({ name: 'otp_expires_at', type: 'timestamptz', nullable: true })
  otpExpiresAt: Date | null;

  @Column({
    name: 'membership_tier',
    type: 'varchar',
    length: 20,
    default: 'bronze',
  })
  membershipTier: string;

  @Column({
    name: 'total_spent',
    type: 'numeric',
    precision: 14,
    scale: 0,
    default: 0,
  })
  totalSpent: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => Address, (address) => address.user)
  addresses: Address[];

  @OneToOne(() => Cart, (cart) => cart.user)
  cart: Cart;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @OneToMany(() => Notification, (notif) => notif.user)
  notifications: Notification[];

  @OneToMany(() => Message, (msg) => msg.user)
  messages: Message[];
}
