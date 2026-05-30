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
import { Category } from './category.entity';
import { Brand } from './brand.entity';
import { ProductVariant } from './product-variant.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid', { name: 'product_id' })
  productId: string;

  @Column({ name: 'category_id' })
  categoryId: string;

  @ManyToOne(() => Category, (category) => category.products)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ name: 'brand_id' })
  brandId: string;

  @ManyToOne(() => Brand, (brand) => brand.products)
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'numeric', precision: 12, scale: 0 })
  price: number;

  @Column({
    name: 'sale_price',
    type: 'numeric',
    precision: 12,
    scale: 0,
    nullable: true,
  })
  salePrice: number;

  @Column({ type: 'text', array: true, default: '{}' })
  images: string[];

  @Column({ length: 200, nullable: true })
  material: string;

  @Column({ length: 10, default: 'unisex' })
  gender: 'men' | 'women' | 'unisex';

  @Column({ length: 100, nullable: true })
  origin: string;

  @Column({ name: 'warranty_info', type: 'text', nullable: true })
  warrantyInfo: string;

  @Column({ name: 'total_stock', type: 'integer', default: 0 })
  totalStock: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => ProductVariant, (variant) => variant.product)
  variants: ProductVariant[];
}
