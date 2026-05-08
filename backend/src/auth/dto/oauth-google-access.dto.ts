import { IsString, MinLength } from 'class-validator';

/** Fluxo web (useGoogleLogin implicit) — valida access_token na API userinfo do Google */
export class OAuthGoogleAccessDto {
  @IsString()
  @MinLength(20)
  accessToken: string;
}
