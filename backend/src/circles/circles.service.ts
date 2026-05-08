import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserContact } from '../users/user-contact.entity';

export const PREDEFINED_CIRCLES = [
  {
    key: 'Família',
    descricao: 'Parentes e familiares próximos',
    badgeColor: '#FF8D28',
    icon: 'home',
  },
  {
    key: 'Trabalho',
    descricao: 'Colegas e ex companheiros de trabalho',
    badgeColor: '#B58C70',
    icon: 'work',
  },
  {
    key: 'Amigos',
    descricao: 'Amigos Pessoais',
    badgeColor: '#FF383C',
    icon: 'favorite',
  },
  {
    key: 'Networking',
    descricao: 'Contatos profissionais',
    badgeColor: '#0088FF',
    icon: 'badge',
  },
  {
    key: 'Esportes',
    descricao: 'Colegas de Atividades esportivas',
    badgeColor: '#CEC489',
    icon: 'sports-soccer',
  },
  {
    key: 'Estudos',
    descricao: 'Colegas de cursos e estudos',
    badgeColor: '#CB30E0',
    icon: 'school',
  },
] as const;

@Injectable()
export class CirclesService {
  constructor(
    @InjectRepository(UserContact)
    private readonly contactRepo: Repository<UserContact>,
  ) {}

  /** Contatos do usuário logado: tags em `user_contacts` (Família, Trabalho, …). */
  async summary(viewerId: number) {
    const rows = await this.contactRepo.find({
      where: { user_id: viewerId },
    });

    const totalPessoas = rows.length;

    const counts: Record<string, number> = {};
    for (const c of PREDEFINED_CIRCLES) {
      counts[c.key] = rows.filter((r) => (r.tags ?? []).includes(c.key)).length;
    }

    const totalCirculos = PREDEFINED_CIRCLES.length;
    let maisPopuloso: string = PREDEFINED_CIRCLES[0].key;
    let max = -1;
    for (const c of PREDEFINED_CIRCLES) {
      if (counts[c.key] > max) {
        max = counts[c.key];
        maisPopuloso = c.key;
      }
    }

    const circles = PREDEFINED_CIRCLES.map((c) => ({
      ...c,
      pessoas: counts[c.key] ?? 0,
    }));

    return {
      resumo: {
        totalCirculos,
        totalPessoas,
        maisPopuloso,
      },
      circles,
    };
  }
}
