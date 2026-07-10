import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Voucher } from './voucher.entity';
import { Order } from './order.entity';

@Entity('user_vouchers')
export class UserVoucher {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'uid' })
  uid: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'uid' })
  user: User;

  @Column({ name: 'voucher_id' })
  voucherId: string;

  @ManyToOne(() => Voucher, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'voucher_id' })
  voucher: Voucher;

  @Column({ name: 'order_id', nullable: true })
  orderId: string;

  @ManyToOne(() => Order, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @CreateDateColumn({ name: 'used_at', type: 'timestamptz' })
  usedAt: Date;
}
