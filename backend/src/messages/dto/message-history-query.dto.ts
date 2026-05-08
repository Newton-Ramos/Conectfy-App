import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class MessageHistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  /** Cursor: mensagens com id < beforeId (histórico mais antigo) */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  beforeId?: number;
}
