import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { assertProductionEnvironment } from './config/assert-production-env';
import { buildCorsOptions } from './config/cors-options';

async function bootstrap() {
  assertProductionEnvironment();

  const uploadsRoot = join(process.cwd(), 'uploads', 'voice');
  if (!existsSync(uploadsRoot)) {
    mkdirSync(uploadsRoot, { recursive: true });
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1);
  app.useWebSocketAdapter(new IoAdapter(app));

  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const corsOptions = buildCorsOptions();

  app.enableCors(corsOptions);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  const port = Number(process.env.PORT || 3333);
  if (Number.isNaN(port) || port < 1 || port > 65535) {
    throw new Error(
      'PORT inválido. Use 1–65535. Em desenvolvimento o padrão é 3333; no Render, PORT vem do ambiente.',
    );
  }
  await app.listen(port, '0.0.0.0');
  const logger = new Logger('Bootstrap');
  logger.log(`HTTP em 0.0.0.0:${port} (NODE_ENV=${process.env.NODE_ENV ?? 'undefined'})`);
}

bootstrap().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('[Conectfy] Falha ao iniciar:', msg);
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});