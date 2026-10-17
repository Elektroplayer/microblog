import { ZodError } from 'zod';
import type { ErrorRequestHandler } from 'express';
import { isHttpError } from 'http-errors';
import ErrorPage from '../struct/Error.js';

export const errorsHandler: ErrorRequestHandler = (error, req, res, _next) => {
    if (error instanceof ZodError) {
        res.status(400).json({
            error: 'Invalid request',
            details: error.issues,
        });

        return;
    }

    if (isHttpError(error)) {
        if (req.path.startsWith('/api/')) {
            res.status(error.statusCode).json({
                error: error.message,
            });
            return;
        }

        // const context = (await req.user?.getContext()) ?? User.defaultContext;

        res.type('html').send(
            ErrorPage.page.render({ code: error.statusCode }, {}),
        );

        return;
    }

    console.error(error);

    res.status(500).json({
        error: 'Internal server error',
    });
};
