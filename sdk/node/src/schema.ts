// Schema field builders for createConfig().
// Declare which keys are live (SSE-updated) vs. static secrets.
export interface SchemaField<T = unknown> {
  readonly live: boolean;
  readonly secret: boolean;
  readonly type: 'string' | 'boolean' | 'number';
  readonly defaultValue: T | undefined;
  readonly optional: boolean;
}

class FieldBuilder<T> implements SchemaField<T> {
  readonly live: boolean;
  readonly secret: boolean;
  readonly type: 'string' | 'boolean' | 'number';
  defaultValue: T | undefined = undefined;
  optional = false;

  constructor(live: boolean, secret: boolean, type: 'string' | 'boolean' | 'number') {
    this.live = live;
    this.secret = secret;
    this.type = type;
  }

  default(value: T): this {
    this.defaultValue = value;
    return this;
  }

  toOptional(): this {
    this.optional = true;
    return this;
  }
}

function builders(live: boolean, secret: boolean) {
  return {
    string: () => new FieldBuilder<string>(live, secret, 'string'),
    boolean: () => new FieldBuilder<boolean>(live, secret, 'boolean'),
    number: () => new FieldBuilder<number>(live, secret, 'number'),
  };
}

// Schema namespace — mirrors the vextis object exported from index.ts
export const schema = {
  live: builders(true, false),
  secret: builders(false, true),
};
