import express from 'express';
import apiUsersRouter from './routes/users.js';
import rootRouter from './routes/root.js';
import postsRouter from './routes/posts.js';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { errorsHandler } from './middleware/errorsHandler.js';
import { loadUser } from './middleware/auth.js';

export const app = express();

app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));

app.get('/favicon.svg', (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile('html/root/favicon.svg', { root: process.cwd() });
});

app.use('/api/users', apiUsersRouter);
app.use('/p', loadUser, postsRouter);
app.use('/', loadUser, rootRouter);

app.use(errorsHandler);
