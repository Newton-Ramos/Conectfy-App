import { IsString, MinLength } from 'class-validator';

/** Token curto do Instagram Basic Display após autorização */
export class OAuthInstagramDto {
  @IsString()
  @MinLength(10)
  accessToken: string;
}
