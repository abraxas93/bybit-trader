import {Store} from '../../domain/entities/Store';
import {RestClientV5} from 'bybit-api';
import {inject, injectable} from 'tsyringe';

@injectable()
export class ProcessExecutedOrder {
  constructor(
    @inject('RestClientV5')
    private readonly client: RestClientV5,
    @inject('Store')
    private readonly store: Store
  ) {}

  execute() {
    try {
      return {data: null, error: null};
    } catch (error) {
      return {data: null, error: (error as Error).message};
    }
  }
}
