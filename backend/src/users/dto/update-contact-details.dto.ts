import { Transform } from 'class-transformer';
import { IsArray, IsEmail, IsOptional, IsString, Matches } from 'class-validator';

/**
 * Telefone anotação: formato (DD) 99999-9999 — 11 dígitos.
 * Opcional: omitir ou string vazia remove do PATCH conforme serviço.
 */
export class UpdateContactDetailsDto {
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsString()
  @Matches(/^\(\d{2}\) \d{5}-\d{4}$/, {
    message: 'Telefone deve estar no formato (DD) 99999-9999',
  })
  telefone?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsEmail({}, { message: 'E-mail inválido' })
  email?: string;

  @IsOptional()
  @IsString()
  nota?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
