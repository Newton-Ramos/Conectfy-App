import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('user_contacts')
export class UserContact {
  @PrimaryColumn()
  user_id: number;

  @PrimaryColumn()
  contact_id: number;

  @Column({ nullable: true })
  telefone: string;

  /** E-mail do contato como anotação do usuário (independente da conta da pessoa). */
  @Column({ nullable: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  nota: string;

  @Column({ default: false })
  is_blocked: boolean;

  @Column({ type: 'jsonb', nullable: true })
  tags?: string[];

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'contact_id' })
  contact: User;
}
