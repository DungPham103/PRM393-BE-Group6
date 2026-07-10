import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
}

export enum MembershipTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
}

@Entity('vouchers')
export class Voucher {
  @PrimaryGeneratedColumn('uuid', { name: 'voucher_id' })
  voucherId: string;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    name: 'discount_type',
    type: 'varchar',
    length: 20,
  })
  discountType: DiscountType;

  @Column({
    name: 'discount_value',
    type: 'numeric',
    precision: 12,
    scale: 0,
  })
  discountValue: number;

  @Column({
    name: 'max_discount',
    type: 'numeric',
    precision: 12,
    scale: 0,
    nullable: true,
  })
  maxDiscount: number | null;

  @Column({
    name: 'min_order_value',
    type: 'numeric',
    precision: 12,
    scale: 0,
    default: 0,
  })
  minOrderValue: number;

  @Column({
    name: 'target_tier',
    type: 'varchar',
    length: 20,
    default: MembershipTier.BRONZE,
  })
  targetTier: MembershipTier;

  @Column({ name: 'usage_limit', type: 'int', nullable: true })
  usageLimit: number | null;

  @Column({ name: 'used_count', type: 'int', default: 0 })
  usedCount: number;

  @Column({ name: 'starts_at', type: 'timestamptz', default: () => 'NOW()' })
  startsAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
