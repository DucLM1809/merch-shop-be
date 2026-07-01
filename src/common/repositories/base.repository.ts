// ponytail: abstract base enforces CRUD contract; concrete repos extend and add domain queries
export abstract class BaseRepository<T, UpdateDto = Partial<T>> {
  protected abstract readonly delegate: {
    findUnique(args: { where: { id: string } }): Promise<T | null>;
    update(args: { where: { id: string }; data: UpdateDto }): Promise<T>;
    delete(args: { where: { id: string } }): Promise<T>;
  };

  findById(id: string): Promise<T | null> {
    return this.delegate.findUnique({ where: { id } });
  }

  update(id: string, data: UpdateDto): Promise<T> {
    return this.delegate.update({ where: { id }, data });
  }

  remove(id: string): Promise<T> {
    return this.delegate.delete({ where: { id } });
  }

  softRemove(id: string): Promise<T> {
    // ponytail: cast safe — all soft-delete entities have deletedAt from migration
    return this.delegate.update({ where: { id }, data: { deletedAt: new Date() } as unknown as UpdateDto });
  }
}
