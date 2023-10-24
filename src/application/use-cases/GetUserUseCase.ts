import Joi from 'joi';
import {EventEmitter} from 'events';
import {IUserRepository} from '../../domain/repositories';
import {ERR_USER_NOT_FOUND, EVENT_ERROR} from '../../constants';
import {inject, injectable} from 'tsyringe';
import {IUserModel} from '../../domain/entities';
import {IUseCase, UseCaseResult} from '../../types';

const schema = Joi.object({
  id: Joi.string().required(),
});

export type IGetUser = IUseCase<
  {id: string},
  Promise<UseCaseResult<IUserModel>>
>;

@injectable()
export class GetUserUseCase implements IGetUser {
  constructor(
    @inject('IUserRepository')
    private readonly userRepo: IUserRepository,
    @inject('EventEmitter')
    private readonly eventEmitter: EventEmitter
  ) {}

  async execute(data: {id: string}): Promise<UseCaseResult<IUserModel>> {
    try {
      const value = schema.validate(data);

      if (value.error) {
        return {data: null, error: value.error.message};
      }

      const user = await this.userRepo.findById(data.id);

      if (!user) return {data: null, error: ERR_USER_NOT_FOUND};

      return {data: user.model, error: null};
    } catch (error) {
      this.eventEmitter.emit(EVENT_ERROR, error);
      return {data: null, error: (error as Error).message};
    }
  }
}
