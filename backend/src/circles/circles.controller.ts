import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CirclesService } from './circles.service';

@Controller('circles')
export class CirclesController {
  constructor(private readonly circlesService: CirclesService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  list(@Request() req: { user: { userId: number } }) {
    return this.circlesService.summary(req.user.userId);
  }
}
