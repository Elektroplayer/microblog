import { app } from './app.js';
import ErrorPage from './struct/Error.js';
import Page from './struct/Page.js';
import Post from './struct/Post.js';

const port = Number(process.env.PORT ?? 3000);

app.listen(port, async () => {
    console.log(`Listening on :${port}`);

    await Page.loadComponents();
    await Page.loadFiles();
    await Post.loadTemplate();
    await ErrorPage.loadTemplate();

    console.log(`init complite`);
});
