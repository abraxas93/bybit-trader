import {ObjectId} from 'mongodb';
import {EventEmitter} from 'events';
import {User} from '../../domain/entities';
import {IUserRepository} from '../../domain/repositories';
import Joi from 'joi';
import {EVENT_ERROR} from '../../constants';
import {inject, injectable} from 'tsyringe';
import {IUseCase, UseCaseResult} from '../../types';

const schema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().alphanum().min(8).max(30).required(),
});

export type ICreateUser = IUseCase<
  {
    email: string;
    password: string;
  },
  Promise<UseCaseResult<string>>
>;

@injectable()
export class CreateUserUseCase implements ICreateUser {
  constructor(
    @inject('IUserRepository')
    private readonly userRepo: IUserRepository,
    @inject('EventEmitter')
    private readonly eventEmitter: EventEmitter
  ) {}

  async execute(data: {email: string; password: string}) {
    try {
      const value = schema.validate(data);

      if (value.error) {
        return {data: null, error: value.error.message};
      }

      const newUser = new User(data, new ObjectId().toString());
      newUser.encryptPassword();
      const insertedId = await this.userRepo.insertOne(newUser);

      return {data: insertedId, error: null};
    } catch (error) {
      this.eventEmitter.emit(EVENT_ERROR, error);
      return {data: null, error: (error as Error).message};
    }
  }
}
