import knex from 'knex';
import { logger } from '../utils/logger';

const config = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'youth_saas'
  },
  pool: {
    min: 2,
    max: 10
  },
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations'
  },
  seeds: {
    directory: './seeds'
  }
};

export const db = knex(config);

// Test database connection
db.raw('SELECT 1')
  .then(() => {
    logger.info('Database connection established');
  })
  .catch((error) => {
    logger.error('Database connection failed:', error);
    process.exit(1);
  });

export default db;
