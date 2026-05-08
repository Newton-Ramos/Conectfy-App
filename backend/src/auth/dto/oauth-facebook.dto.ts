import { IsString, MinLength } from 'class-validator';

export class OAuthFacebookDto {
  @IsString()
  @MinLength(10)
  accessToken: string;
}
