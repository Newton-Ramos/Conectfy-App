import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  list(@Request() req: { user: { userId: number } }) {
    return this.notificationsService.findForUser(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/rsvp')
  rsvp(
    @Request() req: { user: { userId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: 'sim' | 'nao' },
  ) {
    const status = body?.status === 'nao' ? 'nao' : 'sim';
    return this.notificationsService.setRsvp(req.user.userId, id, status);
  }
}
