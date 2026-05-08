import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('message_reactions')
@Index(['messageId', 'userId'], { unique: true })
export class MessageReaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  messageId: number;

  @Column()
  userId: number;

  @Column({ length: 16 })
  emoji: string;

  @CreateDateColumn()
  createdAt: Date;
}
