import {Request, Response} from 'express';
import {inject, injectable} from 'tsyringe';
import {IUserService} from '../../../application';

interface CreateUserRequest extends Request {
  body: {
    email: string;
    password: string;
  };
}

@injectable()
export class UserController {
  constructor(
    @inject('IUserService')
    private readonly userService: IUserService
  ) {}

  handleCreateUser = async (req: CreateUserRequest, res: Response) => {
    const {email, password} = req.body;
    const {error, data} = await this.userService.createUser(email, password);
    if (error) {
      res.status(400).json({error});
    }
    res.status(200).json({data});
  };

  handleUserSignIn = async (req: CreateUserRequest, res: Response) => {
    const {email, password} = req.body;
    const {error, data} = await this.userService.signInUser(email, password);
    if (error) {
      res.status(400).json({error});
    }
    res.status(200).json({data});
  };

  handleGetUser = async (req: CreateUserRequest, res: Response) => {
    const {id} = req.query;
    const {error, data} = await this.userService.findUserById(id as string);
    if (error) {
      res.status(400).json({error});
    }
    res.status(200).json({data});
  };
}
