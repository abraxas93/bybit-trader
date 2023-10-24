import crypto from 'crypto';
import {PASSWORD_SALT, PASSWORD_LENGTH} from '../../config';
import {Entity} from './Entity';

export interface IUserModel {
  email: string;
  password: string;
}

export class User extends Entity<IUserModel> {
  private _id?: string | undefined;
  constructor(model: IUserModel, _id?: string) {
    super(model);
    this._id = _id;
  }

  get id() {
    return this._id;
  }

  static encryptPassword(password: string) {
    const encrypted = crypto.scryptSync(
      password,
      PASSWORD_SALT,
      PASSWORD_LENGTH
    );
    return encrypted.toString('hex');
  }

  encryptPassword() {
    const encrypted = crypto.scryptSync(
      this.model.password,
      PASSWORD_SALT,
      PASSWORD_LENGTH
    );
    this.model.password = encrypted.toString('hex');
  }

  isPasswordValid(anyPassword: string) {
    return this.model.password === User.encryptPassword(anyPassword);
  }
}
