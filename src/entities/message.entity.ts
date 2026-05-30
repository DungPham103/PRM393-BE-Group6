import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum SenderRole {
  CUSTOMER = 'customer',
  STORE = 'store',
}

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid', { name: 'msg_id' })
  msgId: string;

  @Column({ name: 'uid' })
  uid: string;

  @ManyToOne(() => User, (user) => user.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'uid' })
  user: User;

  @Column({
    name: 'sender_role',
    type: 'enum',
    enum: SenderRole,
    default: SenderRole.CUSTOMER,
  })
  senderRole: SenderRole;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'is_bot', default: false })
  isBot: boolean;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @CreateDateColumn({ name: 'sent_at', type: 'timestamptz' })
  sentAt: Date;
}
