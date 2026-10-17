import fs from 'node:fs/promises';
import Page from './Page.js';

interface IErrorData extends Record<string, string> {
    code: string;
}

export default class ErrorPage {
    static page: Page = new Page();

    static async loadTemplate(path = 'html/templates/error.html') {
        const html = await fs.readFile(path, 'utf8');

        this.page.load(html);
    }

    data!: IErrorData;
}
