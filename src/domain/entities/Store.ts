import {injectable} from 'tsyringe';

@injectable()
export class Store {
  constructor(private readonly _symbol: string) {}
  get symbol() {
    return this._symbol;
  }
}
