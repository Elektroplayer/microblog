import { Pool } from 'pg';

export const db = new Pool({
    user: process.env.PG_USER ?? 'microbloger',
    password: process.env.PG_PASS,
    host: process.env.PG_HOST ?? 'localhost',
    port: process.env.PG_PORT ? +process.env.PG_PORT : 5432,
    database: process.env.PG_DB ?? 'microblog_db',
});
