import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { readTypeOrmConnectionOptions } from './typeorm-env';

loadEnv({ path: ['.env.local', '.env'] });

const { synchronize: _sync, logging: _log, ...opts } = readTypeOrmConnectionOptions(
  (k) => process.env[k],
);

export default new DataSource({
  ...opts,
  synchronize: false,
  logging: false,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
});
