import Session from '../struct/Session.ts';
import User from '../struct/User.ts';

declare global {
    namespace Express {
        interface Request {
            user?: User;
            session?: Session;
        }
    }
}

export {};
