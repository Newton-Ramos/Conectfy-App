import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserContact } from '../users/user-contact.entity';
import { CirclesService } from './circles.service';
import { CirclesController } from './circles.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserContact])],
  controllers: [CirclesController],
  providers: [CirclesService],
})
export class CirclesModule {}
