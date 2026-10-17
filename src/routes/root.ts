import { Router } from 'express';
import Page from '../struct/Page.js';
import Post from '../struct/Post.js';
import User from '../struct/User.js';
import createHttpError from 'http-errors';
import { Feed } from 'feed';
import PostModel from '../models/PostModel.js';

const router = Router();

router.get('/rss.rss', async (req, res) => {
    const posts = await PostModel.postList(9999);

    const feed = new Feed({
        title: 'electr0.net микробложик',
        description: 'Микроблог Electro',
        id: 'https://electr0.net/',
        link: 'https://electr0.net/',
        language: 'ru',
        copyright: 'Electro',
        author: {
            name: 'Electro',
            email: 'me@electr0.net',
            link: 'https://electr0.net/',
        },
        feedLinks: {
            rss: 'https://electr0.net/rss.rss',
        },
    });

    for (const post of posts) {
        const url = `https://electr0.net/p/${post.slug}`;

        feed.addItem({
            title: post.title,
            id: url,
            link: url,
            description: post.description ?? '',
            date: post.createdAt,
        });
    }

    res.type('application/rss+xml').send(feed.rss2());
});

router.get('/{*splat}', async (req, res) => {
    const file = Page.findFile(req.path);

    if (!file) throw new createHttpError.NotFound();

    if (file.type === 'page') {
        let data: Record<string, string> = {};

        if (req.path === '/' || req.path === '/index.html') {
            data['postList'] = await Post.postListHtml();
        }

        const context = (await req.user?.getContext()) ?? User.defaultContext;
        const html = file.page.render(data, context);

        res.type('html').send(html);
        return;
    }

    res.type(file.contentType).send(file.content);
});

export default router;
