export abstract class Entity<T> {
  protected readonly data: T;
  constructor(model: T) {
    this.data = model;
  }

  get model() {
    return this.data;
  }

  abstract get id(): string | undefined;
}
