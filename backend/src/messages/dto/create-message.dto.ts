import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Min,
} from 'class-validator';
import { MessageMediaType } from '../entities/message.entity';

export class CreateMessageDto {
  @IsInt()
  receiverId: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(8000)
  content: string;

  @IsOptional()
  @IsInt()
  parentMessageId?: number;

  @IsOptional()
  @IsEnum(MessageMediaType)
  mediaType?: MessageMediaType;

  /** Placeholder S3 / https — integração futura */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  mediaUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  mediaDurationSec?: number;
}
