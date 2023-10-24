import {injectable, inject} from 'tsyringe';
import {ICreateUser, IGetUser, IUserSignIn} from '../use-cases';
import {UseCaseResult} from '../../types';
import {IUserModel} from '../../domain/entities';

/*
 * Facade class to wrap use cases
 * Responsible for use cases orchestration and providing interface access to domain logic
 */

export interface IUserService {
  createUser(email: string, password: string): Promise<UseCaseResult<string>>;
  findUserById(id: string): Promise<UseCaseResult<IUserModel>>;
  signInUser(
    email: string,
    password: string
  ): Promise<UseCaseResult<IUserModel>>;
}

@injectable()
export class UserService implements IUserService {
  constructor(
    @inject('IGetUser')
    private readonly getUserUseCase: IGetUser,
    @inject('ICreateUser')
    private readonly createUserUseCase: ICreateUser,
    @inject('IUserSignIn')
    private readonly userSignInUseCase: IUserSignIn
  ) {}

  createUser(email: string, password: string) {
    return this.createUserUseCase.execute({email, password});
  }

  findUserById(id: string) {
    return this.getUserUseCase.execute({id});
  }

  signInUser(email: string, password: string) {
    return this.userSignInUseCase.execute({email, password});
  }
}
