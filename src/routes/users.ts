import { Router, Request } from 'express';
import User from '../struct/User.js';
import UserModel from '../models/UserModel.js';
import createError from 'http-errors';
import {
    createUserSchema,
    changePasswordSchema,
    loginUserSchema,
    updateUserSchema,
} from './users.schema.js';
import SessionModel from '../models/SessionModel.js';
import { requireAuth } from '../middleware/auth.js';

export function authenticatedUser(req: Request): User {
    if (!req.user)
        throw new createError.Unauthorized('Authentication required');

    return req.user;
}

const router = Router();

// POST /users/reg
router.post('/reg', async (req, res) => {
    console.log(req.body);
    let data = createUserSchema.parse(req.body);
    let user = await UserModel.create(
        data.username,
        data.password,
        data.displayName,
    );

    res.status(201).json(user);
});

// POST /users/login
router.post('/login', async (req, res) => {
    const data = loginUserSchema.parse(req.body);
    const userId = await UserModel.verify(data.username, data.password);

    if (userId === undefined)
        throw new createError.Unauthorized('Неверный логин и пароль');

    const sessionId = await SessionModel.create(userId);

    res.cookie('session', sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(204).end();
});

// GET /users/me
router.get('/me', requireAuth, async (req, res) => {
    let user = authenticatedUser(req);

    res.json(await user.model.publicData());
});

// PATCH /users/me
router.patch('/me', requireAuth, async (req, res, next) => {
    const fields = updateUserSchema.parse(req.body);
    const user = authenticatedUser(req);

    res.json({ user: await user.model.updateData(fields) });
});

// PATCH /users/me/password
router.patch('/me/password', requireAuth, async (req, res, next) => {
    const { oldPassword, newPassword } = changePasswordSchema.parse(req.body);
    const user = authenticatedUser(req);
    const valid = await user.model.verify(oldPassword);

    if (!valid) throw new createError[400]('Неверный текущий пароль');
    if (oldPassword === newPassword)
        throw new createError[400]('Новый пароль должен отличаться от старого');

    await user.model.changePassword(newPassword);

    res.sendStatus(204);
});

// POST /users/logout
router.post('/logout', requireAuth, async (req, res) => {
    await req.session!.model.delete();

    res.clearCookie('session', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
    });

    res.status(204).end();
});

export default router;
