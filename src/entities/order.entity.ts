import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Address } from './address.entity';
import { OrderItem } from './order-item.entity';
import { Voucher } from './voucher.entity';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPING = 'shipping',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  COD = 'cod',
  BANK_TRANSFER = 'bank_transfer',
  E_WALLET = 'e_wallet',
  STRIPE = 'stripe',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid', { name: 'order_id' })
  orderId: string;

  @Column({ name: 'uid' })
  uid: string;

  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn({ name: 'uid' })
  user: User;

  @Column({ name: 'address_id' })
  addressId: string;

  @ManyToOne(() => Address)
  @JoinColumn({ name: 'address_id' })
  address: Address;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.COD,
  })
  paymentMethod: PaymentMethod;

  @Column({ type: 'numeric', precision: 12, scale: 0 })
  subtotal: number;

  @Column({
    name: 'shipping_fee',
    type: 'numeric',
    precision: 12,
    scale: 0,
    default: 0,
  })
  shippingFee: number;

  @Column({ type: 'numeric', precision: 12, scale: 0, default: 0 })
  discount: number;

  @Column({ type: 'numeric', precision: 12, scale: 0 })
  total: number;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ name: 'voucher_id', nullable: true })
  voucherId: string;

  @ManyToOne(() => Voucher, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'voucher_id' })
  voucher: Voucher;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => OrderItem, (item) => item.order)
  items: OrderItem[];
}
