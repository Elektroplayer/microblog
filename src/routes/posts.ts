import { Router } from 'express';
import Post from '../struct/Post.js';
import User from '../struct/User.js';

const router = Router();

router.get('/:slug', async (req, res, next) => {
    try {
        const data = await Post.getPostData(req.params.slug);
        const context = (await req.user?.getContext()) ?? User.defaultContext;

        res.type('html').send(Post.page.render(data, context));
    } catch (error) {
        next(error);
    }
});

export default router;
