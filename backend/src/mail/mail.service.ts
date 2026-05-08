import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Envio opcional via SMTP. Sem SMTP_HOST, nenhum e-mail é enviado (token só na API em dev).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  isSmtpConfigured(): boolean {
    const host = this.config.get<string>('SMTP_HOST');
    return Boolean(host?.trim());
  }

  private createTransport(): nodemailer.Transporter | null {
    const host = this.config.get<string>('SMTP_HOST')?.trim();
    if (!host) return null;
    const port = parseInt(this.config.get<string>('SMTP_PORT') || '587', 10);
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const pass = this.config.get<string>('SMTP_PASS');
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  /** @returns true se o SMTP aceitou o envio */
  async sendPasswordResetEmail(to: string, token: string): Promise<boolean> {
    const transporter = this.createTransport();
    if (!transporter) {
      this.logger.warn(
        'SMTP não configurado (SMTP_HOST) — nenhum e-mail será enviado. Em desenvolvimento use PASSWORD_RESET_RETURN_TOKEN ou NODE_ENV!==production para receber resetToken na resposta.',
      );
      return false;
    }

    const from =
      this.config.get<string>('MAIL_FROM')?.trim() ||
      this.config.get<string>('SMTP_USER')?.trim() ||
      'no-reply@conectfy.local';
    const appUrl = (this.config.get<string>('APP_PUBLIC_URL') || 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
    const link = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

    try {
      await transporter.sendMail({
        from,
        to,
        subject: 'Conectfy — redefinir senha',
        text: `Olá,\n\nRedefina sua senha (link válido por cerca de 1 hora):\n${link}\n\nSe você não pediu isso, ignore este e-mail.\n\nToken alternativo:\n${token}`,
        html: `<p>Olá,</p><p><a href="${link}">Clique aqui para redefinir sua senha</a></p><p>O link expira em cerca de 1 hora.</p><p>Se não conseguir abrir o link, use o token na página &quot;Nova senha&quot;:</p><p style="word-break:break-all;font-family:monospace;font-size:12px">${token}</p>`,
      });
      this.logger.log(`Recuperação de senha: e-mail enviado para ${to}`);
      return true;
    } catch (e) {
      this.logger.error(`Falha ao enviar e-mail de recuperação para ${to}`, e);
      return false;
    }
  }
}
