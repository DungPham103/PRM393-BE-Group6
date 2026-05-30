import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity('product_variants')
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid', { name: 'variant_id' })
  variantId: string;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, (product) => product.variants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ length: 10 })
  size: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL' | 'FREE';

  @Column({ name: 'color_name', length: 50 })
  colorName: string;

  @Column({ name: 'color_hex', length: 7, nullable: true })
  colorHex: string;

  @Column({ unique: true, length: 100 })
  sku: string;

  @Column({ name: 'stock_qty', type: 'integer', default: 0 })
  stockQty: number;

  @Column({
    name: 'extra_price',
    type: 'numeric',
    precision: 12,
    scale: 0,
    default: 0,
  })
  extraPrice: number;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
