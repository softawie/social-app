import { CreateOptions, HydratedDocument, Model } from "mongoose";

export class DatabaseRepo<TDocument> {
  constructor(protected readonly model: Model<TDocument>) {
    this.model = model;
  }
  async create({
    data,
    options,
  }: {
    data: Partial<TDocument>[];
    options?: CreateOptions | undefined;
  }): Promise<HydratedDocument<TDocument>[]|undefined> {
    return await this.model.create(data, options);
  }
}
