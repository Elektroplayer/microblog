import fs from 'node:fs/promises';
import path from 'node:path';
import { minify } from 'html-minifier-terser';
import mime from 'mime-types';
import { minify as minifyTerser } from 'terser';

type File =
    | {
          type: 'static';
          content: Buffer;
          contentType: string;
      }
    | {
          type: 'page';
          page: Page;
          contentType: 'text/html';
      };

type Part =
    | string
    | ((
          data: Record<string, unknown>,
          context: Record<string, unknown>,
      ) => unknown);

export async function minifyHtml(html: string): Promise<string> {
    return minify(html, {
        collapseWhitespace: true,
        removeComments: true,
        collapseBooleanAttributes: true,
        minifyCSS: true,
        minifyJS: true,
    });
}

export default class Page {
    static root = path.resolve('html/root');
    static files = new Map<string, File>();
    static components: Record<string, string> = {};

    static async loadFiles(
        dir: string = 'html/root',
        urlPath = '',
    ): Promise<void> {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const filePath = path.join(dir, entry.name);
            const fileUrl = '/' + path.posix.join(urlPath, entry.name);

            if (entry.isDirectory()) {
                await Page.loadFiles(
                    filePath,
                    path.posix.join(urlPath, entry.name),
                );
                continue;
            }

            const contentType =
                mime.lookup(entry.name) || 'application/octet-stream';

            if (contentType === 'text/html') {
                const html = await fs.readFile(filePath, 'utf8');

                const page = new Page();
                page.load(await minifyHtml(html));

                Page.files.set(fileUrl, {
                    type: 'page',
                    page,
                    contentType: 'text/html',
                });

                continue;
            }

            if (contentType.startsWith('text/javascript')) {
                const source = await fs.readFile(filePath, 'utf8');

                const result = await minifyTerser(source, {
                    compress: {
                        passes: 2,
                    },
                    mangle: true,
                    format: {
                        comments: false,
                    },
                });

                Page.files.set(fileUrl, {
                    type: 'static',
                    content: Buffer.from(result.code ?? ''),
                    contentType,
                });

                continue;
            }

            // if (contentType === 'text/javascript') {
            //     Page.files.set(fileUrl, {
            //         type: 'static',
            //         content: Buffer.from(
            //             await minifyHtml(await fs.readFile(filePath, 'utf8')),
            //         ),
            //         contentType,
            //     });
            //
            //     continue;
            // }

            Page.files.set(fileUrl, {
                type: 'static',
                content: await fs.readFile(filePath),
                contentType,
            });
        }
    }

    static findFile(url: string) {
        url = url.replace(/\/+$/, '') || '/';

        if (url === '/') return Page.files.get('/index.html');

        return Page.files.get(`${url}/index.html`) ?? Page.files.get(url);
    }

    static async loadComponents(dir = 'html/components') {
        for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
            if (entry.isDirectory()) continue;

            const filePath = path.join(dir, entry.name);
            const content = await fs.readFile(filePath, 'utf8');
            const ext = path.extname(entry.name).toLowerCase();

            let component = content;

            switch (ext) {
                case '.html':
                    component = await minifyHtml(content);
                    break;

                case '.css':
                    component = await minifyHtml(
                        `<style>\n${content}\n</style>`,
                    );
                    break;

                case '.js':
                    component = await minifyHtml(
                        `<script>\n${content}\n</script>`,
                    );
                    break;
            }

            Page.components[entry.name] = component;
        }
    }

    static compileVariable(type: string, name: string): Part {
        const keys = name.split('.');

        return (data, context) => {
            let value: unknown = type === 'data' ? data : context;

            for (const key of keys) {
                if (value == null) {
                    return '';
                }

                value = (value as Record<string, unknown>)[key];
            }

            return value ?? '';
        };
    }

    private static compile(html: string): Part[] {
        const parts: Part[] = [];

        const variableRegex =
            /\{\{(component|data|context)\.([a-zA-Z0-9_.]+)\}\}/g;

        let lastIndex = 0;

        for (const match of html.matchAll(variableRegex)) {
            const index = match.index!;

            if (index > lastIndex) parts.push(html.slice(lastIndex, index));

            const [, type, name] = match;

            if (type === 'component') {
                const component = Page.components[name];

                if (component === undefined) {
                    console.warn(`[WARN] Component not found: ${name}`);
                    continue;
                }

                parts.push(...Page.compile(component));
            } else parts.push(Page.compileVariable(type, name));

            lastIndex = index + match[0].length;
        }

        if (lastIndex < html.length) parts.push(html.slice(lastIndex));

        return parts;
    }

    parts: Part[] = [];

    load(html: string): void {
        this.parts = Page.compile(html);
    }

    render(
        data: Record<string, unknown>,
        context: Record<string, unknown>,
    ): string {
        let result = '';

        for (const part of this.parts) {
            result +=
                typeof part === 'string'
                    ? part
                    : String(part(data, context) ?? '');
        }

        return result;
    }
}
