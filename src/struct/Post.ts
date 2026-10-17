import PostModel from '../models/PostModel.js';
import { marked } from 'marked';
import fs from 'node:fs/promises';
import Page from './Page.js';
import createHttpError from 'http-errors';
import { formatDate } from '../lib/utils.js';

interface IPostData extends Record<string, string> {
    title: string;
    content: string;
    description: string;
    meta: string;
}

export default class Post {
    static posts: Map<string, Post> = new Map();
    static page: Page = new Page();

    static async loadTemplate(path = 'html/templates/post_template.html') {
        const html = await fs.readFile(path, 'utf8');

        this.page.load(html);
    }

    static async postListHtml(limit: number = 10, offset: number = 0) {
        let posts = await PostModel.postList(limit, offset);
        let html = '';

        for (let post of posts) {
            html += `<a href="/p/${post.slug}">[${formatDate(post.createdAt)}] ${post.title}</a></br>`;
        }

        return html;
    }

    static async getPostData(slug: string) {
        let p = this.posts.get(slug);

        if (p) {
            p.verify();

            return p.data;
        }

        p = new Post(slug);
        this.posts.set(slug, await p.init());

        return p.data;
    }

    data!: IPostData;
    model: PostModel;

    updatedAt?: Date;

    constructor(public slug: string) {
        this.model = new PostModel(this.slug);
    }

    async init() {
        let info = await this.model.getInfo();

        if (!info) throw new createHttpError.NotFound('Post not found');

        let meta = `${info.author} · ${formatDate(info.createdAt)}`;

        if (info.updatedAt) meta += `  · updated ${formatDate(info.updatedAt)}`;

        let html = await marked.parse(info.content);

        this.data = {
            title: info.title,
            description: info.description ?? '',
            content: html,
            meta: meta,
        };

        return this;
    }
    // TODO: найти место, где его активировать
    async verify() {
        const info = await this.model.getInfo();

        if (!info) {
            Post.posts.delete(this.slug);
            return;
        }

        if (info.updatedAt?.getTime() === this.updatedAt?.getTime()) {
            return;
        }

        await this.init();
    }
}
