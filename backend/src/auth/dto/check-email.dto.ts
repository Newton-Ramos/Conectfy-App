import { Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';

export class CheckEmailDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email: string;
}
