import createError from 'http-errors';
import Session from '../struct/Session.js';
import type { Request, Response, NextFunction } from 'express';

// Без юзера не пускать вовсе
export async function requireAuth(
    req: Request,
    _res: Response,
    next: NextFunction,
) {
    const sessionId = req.cookies.session;

    if (!sessionId)
        throw new createError.Unauthorized('Authentication required');

    const session = new Session(sessionId);
    const user = await session.getUser();

    if (!user) throw new createError.Unauthorized('Authentication required');

    req.user = user;
    req.session = session;

    next();
}

// Без юзера можно, но получить его надо
export async function loadUser(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    const sessionId = req.cookies.session;

    if (!sessionId) {
        next();
        return;
    }

    const session = new Session(sessionId);
    const user = await session.getUser();

    if (!user) {
        res.clearCookie('session');
        session.model.delete();
        next();
        return;
    }

    req.user = user;
    req.session = session;

    next();
}
