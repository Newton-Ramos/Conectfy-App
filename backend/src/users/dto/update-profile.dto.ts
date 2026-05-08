import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  ArrayMaxSize,
  Matches,
  Length,
} from 'class-validator';

export class UpdateProfileDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nome?: string;

  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  localidade?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notas?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  circulos?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  afinidades?: string[];

  /** 11 dígitos (somente números) ou string que será normalizada no service */
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    return String(value).replace(/\D/g, '').slice(0, 11);
  })
  @IsOptional()
  @IsString()
  @Length(11, 11, { message: 'CPF deve conter 11 dígitos' })
  cpf?: string;

  /** dd/mm/aaaa */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}\/\d{2}\/\d{4}$/, {
    message: 'Data de nascimento deve estar no formato dd/mm/aaaa',
  })
  dataNascimento?: string;

  /** 8 dígitos */
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    return String(value).replace(/\D/g, '').slice(0, 8);
  })
  @IsOptional()
  @IsString()
  @Length(8, 8, { message: 'CEP deve conter 8 dígitos' })
  cep?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  logradouro?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(20)
  numero?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(60)
  complemento?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  bairro?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  cidade?: string;

  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    const u = String(value).trim().toUpperCase().slice(0, 2);
    return u.length === 2 ? u : undefined;
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/)
  uf?: string;
}
