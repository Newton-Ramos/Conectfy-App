import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { UserContact } from '../users/user-contact.entity';

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
    @InjectRepository(UserContact)
    private readonly contactRepo: Repository<UserContact>,
  ) {}

  async onModuleInit() {
    const n = await this.repo.count();
    if (n > 0) return;
    const soon = new Date();
    soon.setMinutes(soon.getMinutes() + 90);
    await this.repo.save([
      {
        userId: null,
        title: 'Agatha faz aniversário hoje',
        body: 'Não esqueça de parabenizar. Confirme se vai comparecer ao jantar às 20h.',
        grupo: 'hoje',
        kind: 'evento',
        eventAt: soon,
      },
      {
        userId: null,
        title: 'João e... te convidaram para o Happy Hour hoje às 17h',
        body: 'Bar Central — confirme sua presença para reservarmos lugar.',
        grupo: 'hoje',
        kind: 'evento',
        eventAt: new Date(),
      },
      {
        userId: null,
        title: 'Carina adicionada ao grupo de Amigos',
        body: null,
        grupo: 'ontem',
        kind: 'sistema',
      },
    ]);
  }

  async findForUser(userId: number) {
    const dbNotifs = await this.repo.find({
      where: [{ userId }, { userId: IsNull() }],
      order: { createdAt: 'DESC' },
    });

    /** Contatos do usuário com aniversário no dia atual (compara mês/dia no Postgres). */
    let birthdayRows: { id: number; nome: string }[] = [];
    try {
      birthdayRows = await this.contactRepo.query(
        `
        SELECT u.id AS id, u.nome AS nome
        FROM user_contacts uc
        INNER JOIN users u ON u.id = uc.contact_id
        WHERE uc.user_id = $1
          AND uc.contact_id <> uc.user_id
          AND u."dataNascimento" IS NOT NULL
          AND EXTRACT(MONTH FROM u."dataNascimento")::int = EXTRACT(MONTH FROM CURRENT_DATE)::int
          AND EXTRACT(DAY FROM u."dataNascimento")::int = EXTRACT(DAY FROM CURRENT_DATE)::int
        `,
        [userId],
      );
    } catch {
      birthdayRows = [];
    }

    const birthdayNotifs = birthdayRows.map((r) => ({
      id: -(1_000_000 + r.id),
      userId,
      title: `${r.nome} faz aniversário hoje`,
      body: 'Parabenize seu contato no Conectfy.',
      grupo: 'hoje',
      kind: 'aniversario',
      eventAt: null as Date | null,
      rsvpStatus: null as 'sim' | 'nao' | null,
      createdAt: new Date(),
    }));

    return [...birthdayNotifs, ...dbNotifs];
  }

  async setRsvp(viewerId: number, id: number, status: 'sim' | 'nao') {
    if (id < 0) {
      throw new BadRequestException(
        'Esta notificação não aceita confirmação de presença',
      );
    }
    const n = await this.repo.findOne({ where: { id } });
    if (!n) throw new NotFoundException('Notificação não encontrada');
    if (n.userId != null && n.userId !== viewerId) {
      throw new ForbiddenException();
    }
    n.rsvpStatus = status;
    await this.repo.save(n);
    return n;
  }
}
