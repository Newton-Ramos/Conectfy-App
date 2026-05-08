import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from '../users/dto/login.dto';
import { CheckEmailDto } from './dto/check-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { OAuthGoogleDto } from './dto/oauth-google.dto';
import { OAuthGoogleAccessDto } from './dto/oauth-google-access.dto';
import { OAuthFacebookDto } from './dto/oauth-facebook.dto';
import { OAuthInstagramDto } from './dto/oauth-instagram.dto';
import { InstagramOAuthCodeDto } from './dto/instagram-oauth-code.dto';
import { FacebookOAuthCodeDto } from './dto/facebook-oauth-code.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('check-email')
  async checkEmail(@Body(new ValidationPipe()) dto: CheckEmailDto) {
    return this.authService.checkEmail(dto.email);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body(new ValidationPipe()) loginDto: LoginDto) {
    try {
      return await this.authService.login(loginDto);
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException('Email ou senha inválidos');
    }
  }

  /**
   * Mobile (Expo): valida `access_token` via passport-facebook-token.
   * Envie `access_token` no body (`application/x-www-form-urlencoded` ou JSON).
   */
  @Post('facebook')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('facebook'))
  async facebookLogin(@Req() req: any) {
    return this.authService.loginSocial(req.user);
  }

  /** Remove senha antiga e emite token de redefinição (e-mail em produção). */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body(new ValidationPipe()) dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body(new ValidationPipe()) dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.novaSenha);
  }

  @Post('oauth/google')
  @HttpCode(HttpStatus.OK)
  async oauthGoogle(@Body(new ValidationPipe()) dto: OAuthGoogleDto) {
    return this.authService.loginWithGoogleIdToken(dto.idToken);
  }

  @Post('oauth/google-access')
  @HttpCode(HttpStatus.OK)
  async oauthGoogleAccess(@Body(new ValidationPipe()) dto: OAuthGoogleAccessDto) {
    return this.authService.loginWithGoogleAccessToken(dto.accessToken);
  }

  @Post('oauth/facebook')
  @HttpCode(HttpStatus.OK)
  async oauthFacebook(@Body(new ValidationPipe()) dto: OAuthFacebookDto) {
    return this.authService.loginWithFacebookAccessToken(dto.accessToken);
  }

  /** Fluxo web: troca `code` por token no servidor (usa FACEBOOK_APP_SECRET). */
  @Post('oauth/facebook/complete')
  @HttpCode(HttpStatus.OK)
  async oauthFacebookComplete(
    @Body(new ValidationPipe()) dto: FacebookOAuthCodeDto,
  ) {
    return this.authService.completeFacebookOAuthCode(dto.code, dto.redirectUri);
  }

  @Post('oauth/instagram')
  @HttpCode(HttpStatus.OK)
  async oauthInstagram(@Body(new ValidationPipe()) dto: OAuthInstagramDto) {
    return this.authService.loginWithInstagramAccessToken(dto.accessToken);
  }

  @Post('oauth/instagram/complete')
  @HttpCode(HttpStatus.OK)
  async oauthInstagramComplete(
    @Body(new ValidationPipe()) dto: InstagramOAuthCodeDto,
  ) {
    return this.authService.completeInstagramOAuthCode(dto.code, dto.redirectUri);
  }
}
