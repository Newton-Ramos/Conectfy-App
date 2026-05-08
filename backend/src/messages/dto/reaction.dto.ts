import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class AddReactionDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(16)
  emoji: string;
}
