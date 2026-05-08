import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { User } from './user.entity';
import { UserContact } from './user-contact.entity';
import { normalizeCpf, isValidCpf } from '../utils/validators/cpf';
import { parseBrDate } from '../utils/validators/br-date';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private repo: Repository<User>,
    @InjectRepository(UserContact)
    private contactRepo: Repository<UserContact>,
  ) {}

  // ---------------------------------------------------------------------------
  // CREATE
  // ---------------------------------------------------------------------------
  async create(data: any) {
    const emailNorm = String(data.email).trim().toLowerCase();
    const exists = await this.findByEmail(emailNorm);
    if (exists) throw new ConflictException('Email já cadastrado');

    const cpf = normalizeCpf(data.cpf);
    const cpfExists = await this.repo.findOne({ where: { cpf } });
    if (cpfExists) throw new ConflictException('CPF já cadastrado');

    const nascimento = parseBrDate(data.dataNascimento);
    if (!nascimento) {
      throw new BadRequestException('Data de nascimento inválida');
    }

    const hoje = new Date();
    if (nascimento.getTime() > hoje.getTime()) {
      throw new BadRequestException('Data de nascimento não pode ser no futuro');
    }

    const idadeAnos =
      (hoje.getTime() - nascimento.getTime()) / (1000 * 60 * 60 * 24 * 365.2425);

    if (idadeAnos > 120) {
      throw new BadRequestException('Data de nascimento inválida');
    }

    if (idadeAnos < 18) {
      throw new BadRequestException('É necessário ter 18 anos ou mais');
    }

    const senhaHash = await bcrypt.hash(data.senha, 10);

    const localidade =
      data.cidade && data.uf
        ? `${data.cidade}, ${String(data.uf).trim().toUpperCase()}`
        : undefined;

    const user = this.repo.create({
      nome: data.nome,
      email: emailNorm,
      cpf,
      dataNascimento: nascimento,
      cep: (data.cep ?? '').toString().replace(/\D/g, ''),
      logradouro: data.logradouro,
      numero: data.numero,
      complemento: data.complemento,
      bairro: data.bairro,
      cidade: data.cidade,
      uf: typeof data.uf === 'string' ? data.uf.trim().toUpperCase() : data.uf,
      localidade,
      circulos: [],
      afinidades: [],
      senha: senhaHash,
    });

    await this.repo.save(user);

    const { senha, ...result } = user;
    return result;
  }

  /**
   * Conta mínima (Google / Facebook / Instagram) — CPF etc. completados depois no perfil.
   */
  async createOrLinkOAuth(data: {
    email: string;
    nome: string;
    googleId?: string;
    facebookId?: string;
    instagramId?: string;
  }): Promise<User> {
    const emailNorm = data.email.trim().toLowerCase();
    if (data.googleId) {
      const byG = await this.repo.findOne({ where: { googleId: data.googleId } });
      if (byG) return byG;
    }
    if (data.facebookId) {
      const byF = await this.repo.findOne({ where: { facebookId: data.facebookId } });
      if (byF) return byF;
    }
    if (data.instagramId) {
      const byI = await this.repo.findOne({ where: { instagramId: data.instagramId } });
      if (byI) return byI;
    }

    const byEmail = await this.findByEmail(emailNorm);
    if (byEmail) {
      if (data.googleId) byEmail.googleId = data.googleId;
      if (data.facebookId) byEmail.facebookId = data.facebookId;
      if (data.instagramId) byEmail.instagramId = data.instagramId;
      await this.repo.save(byEmail);
      return byEmail;
    }

    const user = this.repo.create({
      nome: data.nome,
      email: emailNorm,
      senha: null,
      circulos: [],
      afinidades: [],
      googleId: data.googleId ?? null,
      facebookId: data.facebookId ?? null,
      instagramId: data.instagramId ?? null,
    });
    return this.repo.save(user);
  }

  // ---------------------------------------------------------------------------
  // READ
  // ---------------------------------------------------------------------------
  async findAll() {
    const users = await this.repo.find();
    return users.map(({ senha, ...u }) => u);
  }

  /**
   * Dados do contato como salvos em “meus contatos” + email/nome do usuário.
   * Usado no cabeçalho do chat (perfil) e ligações.
   */
  async findContactDetailForViewer(viewerId: number, contactId: number) {
    if (viewerId === contactId) {
      throw new BadRequestException('Operação inválida');
    }
    const user = await this.repo.findOne({ where: { id: contactId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    const meta = await this.contactRepo.findOne({
      where: { user_id: viewerId, contact_id: contactId },
    });
    const { senha, ...publicUser } = user;
    return {
      id: publicUser.id,
      nome: publicUser.nome,
      email: publicUser.email,
      localidade: publicUser.localidade ?? null,
      contactPhone: meta?.telefone ?? null,
      contactNote: meta?.nota ?? null,
      tags: meta?.tags ?? [],
      is_blocked: meta?.is_blocked ?? false,
      inContacts: !!meta,
    };
  }

  /** Lista contatos com tags / bloqueio (visão do usuário logado) */
  async findContactsForViewer(viewerId: number) {
    const users = await this.repo.find();
    const contacts = await this.contactRepo.find({
      where: { user_id: viewerId },
    });
    const byContactId = new Map(contacts.map((c) => [c.contact_id, c]));

    return users
      .filter((u) => u.id !== viewerId)
      .map((u) => {
        const { senha, ...rest } = u;
        const meta = byContactId.get(u.id);
        return {
          ...rest,
          tags: meta?.tags ?? [],
          is_blocked: meta?.is_blocked ?? false,
          contactNote: meta?.nota ?? null,
          contactPhone: meta?.telefone ?? null,
        };
      });
  }

  async findOne(id: number) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const { senha, ...result } = user;
    return result;
  }

  async findByEmail(email: string) {
    const normalized = email.trim().toLowerCase();
    return this.repo
      .createQueryBuilder('u')
      .where('LOWER(u.email) = :email', { email: normalized })
      .getOne();
  }

  // ---------------------------------------------------------------------------
  // PROFILE (Figma — Editar Pessoa)
  // ---------------------------------------------------------------------------
  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const patch: Partial<User> = {};
    if (dto.nome !== undefined) patch.nome = dto.nome;
    if (dto.localidade !== undefined) patch.localidade = dto.localidade;
    if (dto.notas !== undefined) patch.notas = dto.notas;
    if (dto.circulos !== undefined) patch.circulos = dto.circulos;
    if (dto.afinidades !== undefined) patch.afinidades = dto.afinidades;

    if (dto.email !== undefined) {
      const norm = dto.email.trim().toLowerCase();
      if (norm !== user.email) {
        const other = await this.findByEmail(norm);
        if (other && other.id !== userId) {
          throw new ConflictException('Email já cadastrado');
        }
      }
      patch.email = norm;
    }

    if (dto.cpf !== undefined) {
      const cpf = normalizeCpf(dto.cpf);
      if (cpf.length !== 11) {
        throw new BadRequestException('CPF inválido');
      }
      if (!isValidCpf(cpf)) {
        throw new BadRequestException('CPF inválido');
      }
      const taken = await this.repo.findOne({ where: { cpf } });
      if (taken && taken.id !== userId) {
        throw new ConflictException('CPF já cadastrado');
      }
      patch.cpf = cpf;
    }

    if (dto.dataNascimento !== undefined) {
      const d = parseBrDate(dto.dataNascimento);
      if (!d) {
        throw new BadRequestException('Data de nascimento inválida');
      }
      const hoje = new Date();
      if (d.getTime() > hoje.getTime()) {
        throw new BadRequestException('Data de nascimento não pode ser no futuro');
      }
      patch.dataNascimento = d;
    }

    if (dto.cep !== undefined) {
      const cep = String(dto.cep).replace(/\D/g, '');
      if (cep.length !== 8) {
        throw new BadRequestException('CEP inválido');
      }
      patch.cep = cep;
    }

    if (dto.logradouro !== undefined) patch.logradouro = dto.logradouro || undefined;
    if (dto.numero !== undefined) patch.numero = dto.numero || undefined;
    if (dto.complemento !== undefined) patch.complemento = dto.complemento || undefined;
    if (dto.bairro !== undefined) patch.bairro = dto.bairro || undefined;
    if (dto.cidade !== undefined) patch.cidade = dto.cidade || undefined;
    if (dto.uf !== undefined) patch.uf = dto.uf || undefined;

    await this.repo.update(userId, patch as any);
    return this.findOne(userId);
  }

  // ---------------------------------------------------------------------------
  // UPDATE (genérico)
  // ---------------------------------------------------------------------------
  async update(id: number, data: any) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    if (data.senha) {
      data.senha = await bcrypt.hash(data.senha, 10);
    }

    await this.repo.update(id, data);
    return this.findOne(id);
  }

  // ---------------------------------------------------------------------------
  // DELETE
  // ---------------------------------------------------------------------------
  async remove(id: number) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    await this.repo.delete(id);
    return { message: 'Usuário removido com sucesso' };
  }

  // ---------------------------------------------------------------------------
  // AUTH
  // ---------------------------------------------------------------------------
  async validatePassword(email: string, senha: string) {
    const user = await this.findByEmail(email);
    if (!user || !user.senha) return null;

    const isValid = await bcrypt.compare(senha, user.senha);
    if (!isValid) return null;

    const { senha: _, ...result } = user;
    return result;
  }

  /** Limpa a senha (e credenciais antigas) e gera token de redefinição. */
  async startPasswordReset(email: string): Promise<string | null> {
    const user = await this.findByEmail(email);
    if (!user) return null;
    const plain = randomBytes(32).toString('hex');
    user.senha = null;
    user.passwordResetToken = plain;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await this.repo.save(user);
    return plain;
  }

  async completePasswordReset(token: string, novaSenha: string) {
    const user = await this.repo.findOne({
      where: { passwordResetToken: token },
    });
    if (!user || !user.passwordResetExpires) {
      throw new BadRequestException('Token inválido');
    }
    if (user.passwordResetExpires.getTime() < Date.now()) {
      throw new BadRequestException('Token expirado — solicite nova recuperação');
    }
    user.senha = await bcrypt.hash(novaSenha, 10);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await this.repo.save(user);
    const { senha: _, ...result } = user;
    return result;
  }

  // ---------------------------------------------------------------------------
  // CONTATOS / BLOQUEIO (persistido em user_contacts)
  // ---------------------------------------------------------------------------

  async ensureContactRow(userId: number, contactId: number) {
    let row = await this.contactRepo.findOne({
      where: { user_id: userId, contact_id: contactId },
    });
    if (!row) {
      row = this.contactRepo.create({
        user_id: userId,
        contact_id: contactId,
        tags: [],
        is_blocked: false,
      });
      await this.contactRepo.save(row);
    }
    return row;
  }

  async addContact(viewerId: number, contactId: number, tags?: string[]) {
    if (viewerId === contactId) {
      throw new BadRequestException('Inválido');
    }
    const other = await this.repo.findOne({ where: { id: contactId } });
    if (!other) throw new NotFoundException('Usuário não encontrado');

    await this.ensureContactRow(viewerId, contactId);
    if (tags?.length) {
      await this.contactRepo.update(
        { user_id: viewerId, contact_id: contactId },
        { tags },
      );
    }
    return { ok: true };
  }

  async toggleBlockIndividual(userId: number, targetId: number) {
    const row = await this.ensureContactRow(userId, targetId);
    row.is_blocked = !row.is_blocked;
    await this.contactRepo.save(row);
    return { blocked: row.is_blocked };
  }

  async isUserBlocked(receiverId: number, senderId: number): Promise<boolean> {
    const row = await this.contactRepo.findOne({
      where: { user_id: receiverId, contact_id: senderId },
    });
    return row?.is_blocked ?? false;
  }

  async updateContactDetails(
    userId: number,
    contactId: number,
    data: { telefone?: string; nota?: string; tags?: string[] },
  ) {
    const row = await this.ensureContactRow(userId, contactId);
    if (data.telefone !== undefined) row.telefone = data.telefone;
    if (data.nota !== undefined) row.nota = data.nota;
    if (data.tags !== undefined) row.tags = data.tags;
    await this.contactRepo.save(row);
    return row;
  }

  /** Presença — “visto por último” ao sair do socket */
  async recordLastSeen(userId: number, when: Date = new Date()) {
    await this.repo.update(userId, { lastSeenAt: when });
  }
}
