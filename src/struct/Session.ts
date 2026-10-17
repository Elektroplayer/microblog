import SessionModel from '../models/SessionModel.js';
import User from './User.js';

export default class Session {
    model: SessionModel;

    constructor(private id: string) {
        this.model = new SessionModel(this.id);
    }

    async getUser() {
        let userId = await this.model.getUserId();

        return new User(userId);
    }
}
