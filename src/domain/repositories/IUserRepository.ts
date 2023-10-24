import {User} from '../entities';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  insertOne(user: User): Promise<string>;
}
