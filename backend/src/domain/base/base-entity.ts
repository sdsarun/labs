export type EntityProperty = {
  [key: string]: unknown
}

export abstract class Entity<Attributes extends EntityProperty>{
  protected attributes: Attributes;

  constructor(attributes?: Partial<Attributes>) {
    this.attributes = { ...(attributes ?? {}) } as Attributes;
  }

  public update(attributes: Partial<Attributes>): void {
    this.attributes = { ...this.attributes, ...attributes }
  };

  public  toJSON(): Attributes {
    return structuredClone(this.attributes)
  }
}
