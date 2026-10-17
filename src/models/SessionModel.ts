import { db } from '../lib/db.js';
import User from './UserModel.js';
import crypto from 'node:crypto';

export default class SessionModel {
    static async create(userId: number): Promise<string>;
    static async create(user: User): Promise<string>;

    static async create(user: number | User) {
        let userId: number;
        if (typeof user == 'number') userId = user;
        else userId = user.id;

        const sessionId = crypto.randomBytes(32).toString('base64url');

        await db.query(
            `
        INSERT INTO sessions (
            id,
            user_id,
            expires_at
        )
        VALUES ($1, $2, now() + interval '30 days')
        `,
            [sessionId, userId],
        );

        return sessionId;
    }

    constructor(public id: string) {}

    async getUserId() {
        const result = await db.query<{ userId: number }>(
            `
        SELECT user_id AS "userId"
        FROM sessions
        WHERE id = $1
          AND expires_at > now()
        `,
            [this.id],
        );

        return result.rows[0]?.userId;
    }

    async delete(): Promise<void> {
        await db.query(
            `
        DELETE FROM sessions
        WHERE id = $1
        `,
            [this.id],
        );
    }
}
