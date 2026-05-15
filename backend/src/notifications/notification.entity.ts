import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  /** null = visível para todos os usuários (demo) */
  @Column({ type: 'int', nullable: true })
  userId: number | null;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  body?: string | null;

  /** 'hoje' | 'ontem' — agrupamento como no Figma */
  @Column({ length: 16, default: 'hoje' })
  grupo: string;

  /** evento | mensagem | sistema — UI e sons no app */
  @Column({ length: 24, default: 'sistema' })
  kind: string;

  /** Lembrete de evento (opcional) */
  @Column({ type: 'timestamp', nullable: true })
  eventAt?: Date | null;

  /** Confirmação de presença para kind=evento */
  @Column({ type: 'varchar', length: 8, nullable: true })
  rsvpStatus?: 'sim' | 'nao' | null;

  /** Vínculo com evento do calendário (painel espelha a agenda). */
  @Column({ type: 'int', nullable: true })
  calendarEventId?: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User | null;
}
