import {IUserModel, User} from '../../../domain/entities';
import {Collection, MongoClient, ObjectId} from 'mongodb';
import {UserMapper} from '../../mappers';
import {IUserRepository} from '../../../domain/repositories';

export interface UserDto extends IUserModel {
  _id: ObjectId;
}

export class UserRepository implements IUserRepository {
  protected collection: Collection<UserDto>;

  constructor(client: MongoClient, dbName: string, collectionName: string) {
    this.collection = client.db(dbName).collection<UserDto>(collectionName);
  }

  async insertOne(user: User) {
    const dto: UserDto = UserMapper.mapToDTO(user);
    const newUserDto = await this.collection.insertOne(dto);
    return newUserDto.insertedId.toString();
  }

  async findById(id: string) {
    const dto = await this.collection.findOne({_id: new ObjectId(id)});
    if (!dto) return null;
    const {_id, ...model} = dto;
    return new User(model, _id.toString());
  }

  async findByEmail(email: string) {
    const dto = await this.collection.findOne({email});
    if (!dto) return null;
    const {_id, ...model} = dto;
    return new User(model, _id.toString());
  }
}
