import { IsString, MinLength } from 'class-validator';

export class FacebookOAuthCodeDto {
  @IsString()
  @MinLength(10)
  code: string;

  @IsString()
  @MinLength(4)
  redirectUri: string;
}
