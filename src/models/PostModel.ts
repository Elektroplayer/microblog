import { db } from '../lib/db.js';

interface IPostInfo {
    title: string;
    description?: string;
    author: string;
    content: string;
    contentHash: string;
    createdAt: Date;
    updatedAt?: Date;
}

export default class PostModel {
    static async postList(limit: number = 10, offset: number = 0) {
        let result = await db.query(
            `
        SELECT slug, title, created_at as createdAt
        FROM posts
        WHERE is_hidden = false
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2;
        `,
            [limit, offset],
        );

        return result.rows;
    }

    constructor(public slug: string) {}

    async getInfo(): Promise<IPostInfo | null> {
        let result = await db.query(
            `
        SELECT title, description, author, content, content_hash as "contentHash", created_at as "createdAt", updated_at as "updatedAt"
        FROM posts
        WHERE slug = $1;
        `,
            [this.slug],
        );

        return result.rows[0] ?? null;
    }
}
