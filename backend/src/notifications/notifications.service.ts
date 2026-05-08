import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Notification } from './notification.entity';

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
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
    return this.repo.find({
      where: [{ userId }, { userId: IsNull() }],
      order: { createdAt: 'DESC' },
    });
  }

  async setRsvp(viewerId: number, id: number, status: 'sim' | 'nao') {
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
