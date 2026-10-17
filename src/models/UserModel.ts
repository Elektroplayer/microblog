import { db } from '../lib/db.js';
import argon2 from 'argon2';
import createError from 'http-errors';

export type UserUpdateData = { username?: string; displayName?: string };

export default class UserModel {
    constructor(public id: number) {}

    static async getById(id: number) {
        return (await db.query('select * from users where id = $1', [id]))
            .rows[0];
    }

    static async create(
        username: string,
        password: string,
        displayName?: string,
    ) {
        const passwordHash = await argon2.hash(password);

        try {
            const result = await db.query(
                `
            INSERT INTO users (
                username,
                password_hash,
                display_name
            )
            VALUES ($1, $2, $3)
            RETURNING id, username, display_name, created_at
            `,
                [username, passwordHash, displayName ?? null],
            );

            return result.rows[0];
        } catch (error) {
            if (
                error instanceof Error &&
                'code' in error &&
                error.code === '23505'
            )
                throw new createError.Conflict('Имя пользователя уже занято');

            throw error;
        }
    }

    static async verify(
        username: string,
        password: string,
    ): Promise<number | undefined> {
        const result = await db.query<{ id: number; passwordHash: string }>(
            `
            SELECT id, password_hash AS "passwordHash"
            FROM users
            WHERE username = $1
            `,
            [username],
        );

        const user = result.rows[0];

        if (!user) return undefined;

        const valid = await argon2.verify(user.passwordHash, password);

        if (!valid) return undefined;

        return user.id;
    }

    async verify(password: string) {
        const result = await db.query<{ id: number; passwordHash: string }>(
            `
            SELECT password_hash AS "passwordHash"
            FROM users
            WHERE id = $1
            `,
            [this.id],
        );

        const user = result.rows[0];

        if (!user) return false;

        return argon2.verify(user.passwordHash, password);
    }

    async changePassword(password: string) {
        const passwordHash = await argon2.hash(password);

        await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
            passwordHash,
            this.id,
        ]);
    }

    async publicData() {
        const result = await db.query(
            `
            select id, username, display_name as "displayName", created_at as "createdAt"
            from users
            where id=$1
            `,
            [this.id],
        );

        return result.rows[0];
    }

    async updateData(data: UserUpdateData) {
        const values: unknown[] = [];
        const sets: string[] = [];

        try {
            if (data.username !== undefined) {
                values.push(data.username);
                sets.push(`username = $${values.length}`);
            }

            if (data.displayName !== undefined) {
                values.push(data.displayName);
                sets.push(`display_name = $${values.length}`);
            }

            values.push(this.id);

            const result = await db.query(
                `
                UPDATE users
                SET ${sets.join(', ')}
                WHERE id = $${values.length}
                RETURNING id, username, display_name AS "displayName";
                `,
                values,
            );

            return result.rows[0];
        } catch (error) {
            if (
                error instanceof Error &&
                'code' in error &&
                error.code === '23505'
            )
                throw new createError.Conflict('Имя пользователя уже занято');

            throw error;
        }
    }
}
