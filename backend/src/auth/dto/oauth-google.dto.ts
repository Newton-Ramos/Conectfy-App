import { IsString, MinLength } from 'class-validator';

export class OAuthGoogleDto {
  @IsString()
  @MinLength(10)
  idToken: string;
}
