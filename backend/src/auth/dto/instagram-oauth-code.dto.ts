import { IsString, MinLength } from 'class-validator';

export class InstagramOAuthCodeDto {
  @IsString()
  @MinLength(10)
  code: string;

  @IsString()
  @MinLength(4)
  redirectUri: string;
}
