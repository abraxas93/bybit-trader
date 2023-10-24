import {EventEmitter} from 'events';
import {IUserModel} from '../../domain/entities';
import {IUserRepository} from '../../domain/repositories';
import Joi from 'joi';
import {
  ERR_INVALID_PASSWORD,
  ERR_USER_NOT_FOUND,
  EVENT_ERROR,
} from '../../constants';
import {inject, injectable} from 'tsyringe';
import {IUseCase, UseCaseResult} from '../../types';

const schema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().alphanum().min(8).max(30).required(),
});

export type IUserSignIn = IUseCase<
  {
    email: string;
    password: string;
  },
  Promise<UseCaseResult<IUserModel>>
>;

@injectable()
export class UserSignInUseCase implements IUserSignIn {
  constructor(
    @inject('IUserRepository')
    private readonly userRepo: IUserRepository,
    @inject('EventEmitter')
    private readonly eventEmitter: EventEmitter
  ) {}

  async execute(data: {
    email: string;
    password: string;
  }): Promise<UseCaseResult<IUserModel>> {
    try {
      const value = schema.validate(data);

      if (value.error) {
        return {data: null, error: value.error.message};
      }

      const user = await this.userRepo.findByEmail(data.email);
      if (!user) return {data: null, error: ERR_USER_NOT_FOUND};

      if (!user.isPasswordValid(data.password)) {
        return {data: null, error: ERR_INVALID_PASSWORD};
      }

      return {data: user.model, error: null};
    } catch (error) {
      this.eventEmitter.emit(EVENT_ERROR, error);
      return {data: null, error: (error as Error).message};
    }
  }
}
