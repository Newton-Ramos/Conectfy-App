import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserContact } from '../users/user-contact.entity';

export const PREDEFINED_CIRCLES = [
  {
    key: 'Família',
    descricao: 'Parentes e familiares próximos',
    badgeColor: '#f59e0b',
    icon: 'home',
  },
  {
    key: 'Trabalho',
    descricao: 'Colegas e ex companheiros de trabalho',
    badgeColor: '#475569',
    icon: 'work',
  },
  {
    key: 'Amigos',
    descricao: 'Amigos Pessoais',
    badgeColor: '#fb7185',
    icon: 'favorite',
  },
  {
    key: 'Networking',
    descricao: 'Contatos profissionais',
    badgeColor: '#2563eb',
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
    /** Contatos reais (nunca o próprio usuário como `contact_id`). */
    const totalPessoas = await this.contactRepo
      .createQueryBuilder('uc')
      .where('uc.user_id = :viewerId', { viewerId })
      .andWhere('uc.contact_id <> uc.user_id')
      .getCount();

    /** Contagem por tag via unnest do JSONB (uma linha de contato pode ter várias tags). */
    const rawCounts: { tag: string; cnt: string | number }[] =
      await this.contactRepo.query(
        `
      SELECT j.elem AS tag, COUNT(*)::int AS cnt
      FROM user_contacts uc
      CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(uc.tags, '[]'::jsonb)) AS j(elem)
      WHERE uc.user_id = $1
        AND uc.contact_id <> uc.user_id
      GROUP BY j.elem
      ORDER BY cnt DESC, tag ASC
      `,
        [viewerId],
      );

    const tagToCount = new Map<string, number>();
    for (const row of rawCounts) {
      tagToCount.set(row.tag, Number(row.cnt));
    }

    const totalCirculos = tagToCount.size;

    let maisPopuloso = '-';
    if (rawCounts.length > 0) {
      maisPopuloso = rawCounts[0].tag;
    }

    const predefinedKeys = new Set<string>(
      PREDEFINED_CIRCLES.map((c) => c.key),
    );

    const circles: {
      key: string;
      descricao: string;
      badgeColor: string;
      icon: string;
      pessoas: number;
    }[] = [];

    for (const c of PREDEFINED_CIRCLES) {
      const n = tagToCount.get(c.key) ?? 0;
      if (n > 0) {
        circles.push({
          key: c.key,
          descricao: c.descricao,
          badgeColor: c.badgeColor,
          icon: c.icon,
          pessoas: n,
        });
      }
    }

    const customEntries = [...tagToCount.entries()]
      .filter(([key, n]) => !predefinedKeys.has(key) && n > 0)
      .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));

    for (const [key, n] of customEntries) {
      circles.push({
        key,
        descricao: 'Categoria personalizada',
        badgeColor: '#94a3b8',
        icon: 'label',
        pessoas: n,
      });
    }

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
