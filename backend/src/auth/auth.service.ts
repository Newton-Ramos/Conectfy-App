import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';

import { LoginDto } from '../users/dto/login.dto';
import { UsersService } from 'src/users/users.service';
import { User } from '../users/user.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  /** Fluxo Figma: email primeiro → continuar ou cadastro */
  async checkEmail(email: string) {
    const user = await this.usersService.findByEmail(email);
    return { exists: !!user };
  }

  private issueJwtPayload(user: Pick<User, 'id' | 'email' | 'nome'>) {
    const payload = {
      sub: user.id,
      email: user.email,
      nome: user.nome,
      role: 'user',
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
      },
    };
  }

  /**
   * Social login genérico (FacebookStrategy injeta `req.user`).
   * Cria ou vincula conta mínima e devolve JWT do sistema.
   */
  async loginSocial(userSocial: {
    email: string;
    nome: string;
    facebookId?: string;
    googleId?: string;
    instagramId?: string;
  }) {
    const user = await this.usersService.createOrLinkOAuth({
      email: userSocial.email,
      nome: userSocial.nome,
      facebookId: userSocial.facebookId,
      googleId: userSocial.googleId,
      instagramId: userSocial.instagramId,
    });
    return this.issueJwtPayload(user);
  }

  // ================= LOGIN =================
  async login(loginDto: LoginDto) {
    const pending = await this.usersService.findByEmail(loginDto.email);
    if (
      pending?.passwordResetToken &&
      pending.passwordResetExpires &&
      pending.passwordResetExpires.getTime() > Date.now() &&
      !pending.senha
    ) {
      throw new UnauthorizedException(
        'Redefina sua senha pelo link de recuperação (ou use o token no app).',
      );
    }

    const user = await this.usersService.validatePassword(
      loginDto.email,
      loginDto.senha,
    );

    if (!user) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    return this.issueJwtPayload(user);
  }

  // ================= RECUPERAR SENHA =================
  /**
   * Remove a senha antiga (null) e gera token. Em produção, envie o token por e-mail;
   * com PASSWORD_RESET_RETURN_TOKEN=true a API devolve o token (apenas dev/homolog).
   */
  async forgotPassword(email: string) {
    let plain: string | null;
    try {
      plain = await this.usersService.startPasswordReset(email);
    } catch (e) {
      this.logger.error('Erro ao iniciar recuperação de senha', e);
      throw new InternalServerErrorException(
        'Não foi possível processar a solicitação. Tente novamente.',
      );
    }

    if (!plain) {
      return {
        message:
          'Se o e-mail existir em nossa base, você receberá instruções para redefinir a senha.',
      };
    }

    const emailSent = await this.mailService.sendPasswordResetEmail(
      String(email).trim().toLowerCase(),
      plain,
    );

    const exposeTokenInBody =
      process.env.PASSWORD_RESET_RETURN_TOKEN === 'true' ||
      process.env.NODE_ENV !== 'production';

    const message = emailSent
      ? 'Enviamos um e-mail com o link para redefinir sua senha.'
      : exposeTokenInBody
        ? 'Senha antiga removida. Em ambiente de desenvolvimento, use o token abaixo ou a página Nova senha.'
        : 'Se o e-mail existir, você receberá em breve as instruções no endereço informado.';

    return {
      message,
      ...(exposeTokenInBody ? { resetToken: plain } : {}),
    };
  }

  async resetPassword(token: string, novaSenha: string) {
    const user = await this.usersService.completePasswordReset(token, novaSenha);
    return this.issueJwtPayload(user);
  }

  // ================= OAUTH: GOOGLE =================
  async loginWithGoogleIdToken(idToken: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new BadRequestException('Login Google não configurado (GOOGLE_CLIENT_ID)');
    }
    const extra = [
      process.env.GOOGLE_IOS_CLIENT_ID,
      process.env.GOOGLE_ANDROID_CLIENT_ID,
    ].filter(Boolean) as string[];
    const audience = [clientId, ...extra];
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken, audience });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      throw new UnauthorizedException('Google não retornou e-mail');
    }
    const user = await this.usersService.createOrLinkOAuth({
      email: payload.email.toLowerCase(),
      nome: payload.name ?? payload.email.split('@')[0],
      googleId: payload.sub,
    });
    return this.issueJwtPayload(user);
  }

  /** Web (useGoogleLogin fluxo implicit): valida access_token via userinfo */
  async loginWithGoogleAccessToken(accessToken: string) {
    const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!r.ok) {
      throw new UnauthorizedException('Token Google inválido ou expirado');
    }
    const data = (await r.json()) as {
      sub?: string;
      email?: string;
      name?: string;
    };
    if (!data.sub || !data.email) {
      throw new UnauthorizedException('Google não retornou e-mail ou identificador');
    }
    const user = await this.usersService.createOrLinkOAuth({
      email: data.email.toLowerCase(),
      nome: data.name ?? data.email.split('@')[0],
      googleId: data.sub,
    });
    return this.issueJwtPayload(user);
  }

  // ================= OAUTH: FACEBOOK =================
  async loginWithFacebookAccessToken(accessToken: string) {
    const url = `https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(accessToken)}`;
    const res = await fetch(url);
    const data = (await res.json()) as {
      id?: string;
      name?: string;
      email?: string;
      error?: { message?: string };
    };
    if (data.error?.message) {
      throw new UnauthorizedException(data.error.message);
    }
    if (!data.id) {
      throw new UnauthorizedException('Resposta inválida do Facebook');
    }
    const email =
      data.email?.toLowerCase() ??
      `fb_${data.id}@facebook.oauth.conectfy`;
    const user = await this.usersService.createOrLinkOAuth({
      email,
      nome: data.name ?? `Facebook ${data.id}`,
      facebookId: data.id,
    });
    return this.issueJwtPayload(user);
  }

  async completeFacebookOAuthCode(code: string, redirectUri: string) {
    const appId = process.env.FACEBOOK_APP_ID;
    const secret = process.env.FACEBOOK_APP_SECRET;
    if (!appId || !secret) {
      throw new BadRequestException('Facebook OAuth não configurado');
    }
    const tokenUrl =
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `client_id=${encodeURIComponent(appId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&client_secret=${encodeURIComponent(secret)}` +
      `&code=${encodeURIComponent(code)}`;
    const res = await fetch(tokenUrl);
    const json = (await res.json()) as { access_token?: string; error?: { message?: string } };
    if (json.error?.message || !json.access_token) {
      throw new UnauthorizedException(json.error?.message ?? 'Código Facebook inválido');
    }
    return this.loginWithFacebookAccessToken(json.access_token);
  }

  // ================= OAUTH: INSTAGRAM (Basic Display / token de usuário) =================
  async loginWithInstagramAccessToken(accessToken: string) {
    const url = `https://graph.instagram.com/me?fields=id,username&access_token=${encodeURIComponent(accessToken)}`;
    const res = await fetch(url);
    const data = (await res.json()) as {
      id?: string;
      username?: string;
      error?: { message?: string };
    };
    if (data.error?.message) {
      throw new UnauthorizedException(data.error.message);
    }
    if (!data.id) {
      throw new UnauthorizedException('Token Instagram inválido');
    }
    const email = `ig_${data.id}@instagram.oauth.conectfy`;
    const user = await this.usersService.createOrLinkOAuth({
      email,
      nome: data.username ? `@${data.username}` : `Instagram ${data.id}`,
      instagramId: data.id,
    });
    return this.issueJwtPayload(user);
  }

  /** Troca authorization code por access_token (segredo no servidor). */
  async completeInstagramOAuthCode(code: string, redirectUri: string) {
    const clientId = process.env.INSTAGRAM_APP_ID;
    const clientSecret = process.env.INSTAGRAM_APP_SECRET;
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Instagram OAuth não configurado');
    }
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    });
    const res = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const raw = (await res.json()) as {
      access_token?: string;
      user_id?: number;
      error_message?: string;
    };
    if (raw.error_message || !raw.access_token) {
      throw new UnauthorizedException(
        raw.error_message ?? 'Não foi possível validar o código Instagram',
      );
    }
    return this.loginWithInstagramAccessToken(raw.access_token);
  }

  // ================= VALIDATE TOKEN =================
  async validateToken(token: string) {
    try {
      if (!token) return null;
      return this.jwtService.verify(token);
    } catch {
      return null;
    }
  }
}
