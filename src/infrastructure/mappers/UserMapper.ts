import {ObjectId} from 'mongodb';
import {User} from '../../domain/entities';
import {UserDto} from '../database/mongo/UserRepository';

export class UserMapper {
  static mapToDTO(user: User): UserDto {
    return {
      _id: user.id ? new ObjectId(user.id) : new ObjectId(),
      ...user.model,
    };
  }
}
