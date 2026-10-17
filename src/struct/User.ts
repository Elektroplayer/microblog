import { formatDate } from '../lib/utils.js';
import UserModel from '../models/UserModel.js';

export default class User {
    static defaultContext = {
        navContent: `<a href="/login">Войти</a>`,
    };

    model: UserModel;
    constructor(public id: number) {
        this.model = new UserModel(id);
    }

    async getContext() {
        let data = await this.model.publicData();

        return {
            username: data.username,
            displayName: data.displayName ?? data.username,
            createdAt: formatDate(data.createdAt),
            navContent: `<a href="/account">${data.displayName ?? data.username}</a>`,
        };
    }
}
