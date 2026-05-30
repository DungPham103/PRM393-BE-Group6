import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('store_locations')
export class StoreLocation {
  @PrimaryGeneratedColumn('uuid', { name: 'store_id' })
  storeId: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'double precision' })
  lat: number;

  @Column({ type: 'double precision' })
  lng: number;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ name: 'open_time', type: 'time', default: '08:00' })
  openTime: string;

  @Column({ name: 'close_time', type: 'time', default: '21:00' })
  closeTime: string;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
