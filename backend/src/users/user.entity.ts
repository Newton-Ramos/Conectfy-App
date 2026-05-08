import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nome: string;

  @Column({ unique: true })
  email: string;

  // Armazenar somente os 11 dígitos
  @Column({ unique: true, length: 11, nullable: true })
  cpf?: string;

  @Column({ type: 'date', nullable: true })
  dataNascimento?: Date;

  @Column({ length: 8, nullable: true })
  cep?: string;

  @Column({ length: 120, nullable: true })
  logradouro?: string;

  @Column({ length: 20, nullable: true })
  numero?: string;

  @Column({ length: 60, nullable: true })
  complemento?: string;

  @Column({ length: 80, nullable: true })
  bairro?: string;

  @Column({ length: 80, nullable: true })
  cidade?: string;

  @Column({ length: 2, nullable: true })
  uf?: string;

  /** Ex.: "Brasília, DF" — tela Editar Pessoa (Figma) */
  @Column({ length: 120, nullable: true })
  localidade?: string;

  @Column({ type: 'text', nullable: true })
  notas?: string;

  /** Chips de círculos selecionados (Família, Trabalho, …) */
  @Column({ type: 'jsonb', nullable: true })
  circulos?: string[];

  /** Chips de afinidades */
  @Column({ type: 'jsonb', nullable: true })
  afinidades?: string[];

  /** Null durante reset de senha ou contas só OAuth (varchar explícito evita bug TypeORM + union type) */
  @Column({ type: 'varchar', length: 72, nullable: true })
  senha: string | null;

  /** Token único para redefinição de senha (limpa senha antiga ao solicitar recuperação) */
  @Column({ type: 'varchar', length: 128, nullable: true })
  passwordResetToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  passwordResetExpires?: Date | null;

  @Column({ type: 'varchar', length: 64, unique: true, nullable: true })
  googleId: string | null;

  @Column({ type: 'varchar', length: 64, unique: true, nullable: true })
  facebookId: string | null;

  @Column({ type: 'varchar', length: 64, unique: true, nullable: true })
  instagramId: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  criadoEm: Date;

  /** Presença — atualizado ao desconectar do socket / última atividade */
  @Column({ type: 'timestamp', nullable: true })
  lastSeenAt?: Date | null;
}
