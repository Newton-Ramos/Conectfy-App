import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { MessagesService } from './messages.service';
import { UsersService } from '../users/users.service';

type JwtWsPayload = { sub: number };

@WebSocketGateway({
  cors: { origin: '*' },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly activeSockets = new Map<number, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly messagesService: MessagesService,
    private readonly usersService: UsersService,
  ) {}

  private resolveToken(client: Socket): string | undefined {
    const auth = client.handshake.auth as { token?: string } | undefined;
    const q = client.handshake.query as { token?: string };
    return auth?.token ?? q?.token;
  }

  async handleConnection(client: Socket) {
    const token = this.resolveToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const payload = this.jwtService.verify<JwtWsPayload>(token);
      const userId = payload.sub;
      if (!userId) {
        client.disconnect(true);
        return;
      }
      (client.data as { userId?: number }).userId = userId;
      this.activeSockets.set(userId, client.id);
      client.join(`user:${userId}`);
      this.server.emit('user_online', { userId });
    } catch {
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = (client.data as { userId?: number }).userId;
    if (!userId) return;
    if (this.activeSockets.get(userId) === client.id) {
      this.activeSockets.delete(userId);
    }
    await this.usersService.recordLastSeen(userId);
    this.server.emit('user_offline', { userId });
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      receiverId: number;
      content: string;
      parentMessageId?: number;
      mediaType?: string;
      mediaUrl?: string;
      mediaDurationSec?: number;
    },
  ) {
    const senderId = (client.data as { userId?: number }).userId;
    if (!senderId) return { status: 'error', message: 'Não autenticado' };

    try {
      const msg = await this.messagesService.create({
        senderId,
        receiverId: data.receiverId,
        content: data.content,
        parentMessageId: data.parentMessageId ?? null,
        mediaType: data.mediaType as any,
        mediaUrl: data.mediaUrl ?? null,
        mediaDurationSec: data.mediaDurationSec ?? null,
      });

      const receiverSid = this.activeSockets.get(data.receiverId);
      if (receiverSid) {
        this.server.to(receiverSid).emit('receive_message', msg);
        await this.messagesService.markDeliveredForReceiver([msg.id], data.receiverId);
      }

      client.emit('message_sent', msg);

      return { status: 'ok', data: msg };
    } catch (e: any) {
      return { status: 'error', message: e?.message ?? 'Falha ao enviar' };
    }
  }

  /** Destinatário confirma que recebeu no aparelho → ticks cinza */
  @SubscribeMessage('message_ack_delivered')
  async handleAckDelivered(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { messageIds: number[] },
  ) {
    const receiverId = (client.data as { userId?: number }).userId;
    if (!receiverId || !body?.messageIds?.length) return { ok: false };
    const res = await this.messagesService.markDeliveredForReceiver(body.messageIds, receiverId);
    return { ok: true, ...res };
  }

  @SubscribeMessage('typing_status')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { receiverId: number; typing: boolean },
  ) {
    const senderId = (client.data as { userId?: number }).userId;
    if (!senderId || !body?.receiverId) return;

    const receiverSid = this.activeSockets.get(body.receiverId);
    if (receiverSid) {
      this.server.to(receiverSid).emit('typing_status', {
        senderId,
        typing: !!body.typing,
      });
    }
  }
}
