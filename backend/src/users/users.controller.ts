import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Patch,
  UseGuards,
  Request,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateContactDetailsDto } from './dto/update-contact-details.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Request() req) {
    return this.usersService.findOne(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/profile')
  async updateMyProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.userId, dto);
  }

  /** Contatos com tags e bloqueio (Figma — lista) */
  @UseGuards(JwtAuthGuard)
  @Get('contacts/list')
  async contactsList(@Request() req) {
    return this.usersService.findContactsForViewer(req.user.userId);
  }

  /** Perfil do contato no chat (telefone/nota/tags como salvos) */
  @UseGuards(JwtAuthGuard)
  @Get('contacts/detail/:contactId')
  async contactDetail(
    @Request() req,
    @Param('contactId', ParseIntPipe) contactId: number,
  ) {
    return this.usersService.findContactDetailForViewer(req.user.userId, contactId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('contacts/:contactId')
  async addContact(
    @Request() req,
    @Param('contactId', ParseIntPipe) contactId: number,
    @Body() body: { tags?: string[] },
  ) {
    return this.usersService.addContact(req.user.userId, contactId, body?.tags);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: any,
  ) {
    return this.usersService.update(id, updateData);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/details')
  async updateContactDetails(
    @Param('id', ParseIntPipe) contactId: number,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    data: UpdateContactDetailsDto,
    @Request() req,
  ) {
    return this.usersService.updateContactDetails(req.user.userId, contactId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/toggle-block')
  async toggleBlock(
    @Param('id', ParseIntPipe) contactId: number,
    @Request() req,
  ) {
    return this.usersService.toggleBlockIndividual(req.user.userId, contactId);
  }
}
