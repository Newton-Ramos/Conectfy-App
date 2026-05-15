import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CalendarService } from './calendar.service';
import { UsersService } from '../users/users.service';

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(
    private readonly calendarService: CalendarService,
    private readonly usersService: UsersService,
  ) {}

  @Get('events')
  async list(@Request() req: { user: { userId: number } }) {
    const user = await this.usersService.findOne(req.user.userId);
    return this.calendarService.listForUser(req.user.userId, user?.email);
  }

  @Post('events')
  async create(
    @Request() req: { user: { userId: number } },
    @Body() body: { title: string; notes?: string; dateIso: string },
  ) {
    const user = await this.usersService.findOne(req.user.userId);
    return this.calendarService.create(req.user.userId, user?.email, body);
  }

  @Delete('events/:id')
  async remove(
    @Request() req: { user: { userId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.calendarService.remove(req.user.userId, id);
  }
}
