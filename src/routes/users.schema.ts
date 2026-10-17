import { z } from 'zod';

const username = z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[a-z0-9_\-]+$/);

const password = z.string().min(8).max(128);

const displayName = z.string().trim().min(1).max(80);

export const createUserSchema = z.object({
    username,
    password,
    displayName: displayName.optional(),
});

export const loginUserSchema = z.object({
    username,
    password,
});

export const updateUserSchema = z
    .object({
        username: username.optional(),
        displayName: displayName.optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0);

export const changePasswordSchema = z.object({
    oldPassword: password,
    newPassword: password,
});
