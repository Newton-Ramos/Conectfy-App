import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import FacebookTokenStrategy = require('passport-facebook-token');

type FacebookProfile = {
  id?: string;
  name?: { givenName?: string; familyName?: string };
  displayName?: string;
  emails?: Array<{ value: string }>;
  photos?: Array<{ value: string }>;
};

@Injectable()
export class FacebookStrategy extends PassportStrategy(
  FacebookTokenStrategy,
  'facebook',
) {
  constructor(configService: ConfigService) {
    const clientID = configService.get<string>('FACEBOOK_APP_ID')?.trim();
    const clientSecret = configService
      .get<string>('FACEBOOK_APP_SECRET')
      ?.trim();
    if (!clientID || !clientSecret) {
      console.warn(
        '[Auth] Facebook OAuth desativado: defina FACEBOOK_APP_ID e FACEBOOK_APP_SECRET para habilitar POST /auth/facebook.',
      );
    }
    super({
      clientID: clientID || 'not-configured',
      clientSecret: clientSecret || 'not-configured',
      fbGraphVersion: 'v17.0',
      profileFields: ['id', 'displayName', 'photos', 'email', 'name'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: FacebookProfile,
    done: (err: any, user: any, info?: any) => void,
  ): Promise<any> {
    try {
      const facebookId = profile?.id;
      if (!facebookId) {
        throw new UnauthorizedException('Facebook não retornou identificador');
      }

      const email = profile?.emails?.[0]?.value?.trim()?.toLowerCase();
      const nome =
        profile?.displayName ||
        [profile?.name?.givenName, profile?.name?.familyName]
          .filter(Boolean)
          .join(' ')
          .trim() ||
        `Facebook ${facebookId}`;

      const foto = profile?.photos?.[0]?.value;

      return done(null, {
        facebookId,
        email: email ?? `fb_${facebookId}@facebook.oauth.conectfy`,
        nome,
        foto,
        accessToken,
      });
    } catch (e) {
      return done(e, false);
    }
  }
}
