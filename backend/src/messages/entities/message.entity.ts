import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
  RelationId,
} from 'typeorm';

/** Estados para ticks: enviado → entregue (socket) → lido */
export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
}

export enum MessageMediaType {
  TEXT = 'text',
  IMAGE = 'image',
  VOICE = 'voice',
}

@Entity('messages')
@Index(['senderId', 'receiverId', 'createdAt'])
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  senderId: number;

  @Column({ type: 'int' })
  receiverId: number;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.SENT,
  })
  status: MessageStatus;

  @Column({ type: 'timestamp', nullable: true })
  read_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  editedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  /** Mensagem citada (reply) — FK para a mesma tabela */
  @ManyToOne(() => Message, (m) => m.replies, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parentMessageId' })
  parent: Message | null;

  @OneToMany(() => Message, (m) => m.parent)
  replies: Message[];

  @RelationId((m: Message) => m.parent)
  parentMessageId: number | null;

  @Column({
    type: 'enum',
    enum: MessageMediaType,
    default: MessageMediaType.TEXT,
  })
  mediaType: MessageMediaType;

  /** URL no S3 / storage (placeholder até upload real) */
  @Column({ type: 'text', nullable: true })
  mediaUrl: string | null;

  @Column({ type: 'int', nullable: true })
  mediaDurationSec: number | null;
}
