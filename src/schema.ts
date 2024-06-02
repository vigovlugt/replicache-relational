export function table<
    TName extends string,
    TSchema extends Record<string, Column>
>(name: TName, schema: TSchema) {
    return new Table(name, schema) as Table<TName, TSchema> & {
        [K in keyof TSchema]: TSchema[K];
    };
}

export class Table<
    TName extends string = string,
    TSchema extends Record<string, Column> = Record<string, Column>
> {
    _: {
        name: TName;
        schema: TSchema;
        primaryKeys: string[];
    };

    constructor(name: TName, schema: TSchema) {
        this._ = {
            name,
            schema: Object.fromEntries(
                Object.entries(schema).map(([key, value]) => [
                    key,
                    new Column(
                        value.name,
                        value.type,
                        value.isPrimaryKey,
                        value.defaultValue,
                        this
                    ),
                ])
            ) as TSchema,
            primaryKeys: Object.keys(schema).filter(
                (key) => schema[key].isPrimaryKey
            ),
        };

        if (this._.primaryKeys.length === 0) {
            throw new Error("Table must have at least one primary key");
        }

        for (const key of Object.keys(schema)) {
            const column = this._.schema[key];
            this[key] = column;
        }
    }
}

export type ColumnType = "string" | "number" | "boolean" | "date";

export const nullSymbol = Symbol("replicache-relations:null");
export type NullSymbol = typeof nullSymbol;

export class Column<
    TName extends string = string,
    TType extends ColumnType = ColumnType,
    TPrimaryKey extends boolean = boolean,
    TDefaultValue extends
        | InferColumnType<TType>
        | (() => InferColumnType<TType>)
        | NullSymbol =
        | InferColumnType<TType>
        | (() => InferColumnType<TType>)
        | NullSymbol
> {
    name: TName;
    type: TType;
    isPrimaryKey: TPrimaryKey;
    defaultValue: TDefaultValue;
    table?: Table;

    constructor(
        name: TName,
        type: TType,
        isPrimaryKey: TPrimaryKey,
        defaultValue: TDefaultValue,
        table?: Table
    ) {
        this.name = name;
        this.type = type;
        this.isPrimaryKey = isPrimaryKey;
        this.defaultValue = defaultValue;
        this.table = table;
    }

    primaryKey() {
        return new Column(this.name, this.type, true, this.defaultValue);
    }

    default<
        TDefault extends
            | InferColumnType<TType>
            | (() => InferColumnType<TType>)
            | NullSymbol
    >(value: TDefault) {
        return new Column(this.name, this.type, this.isPrimaryKey, value);
    }
}

export function string<TName extends string>(
    name: TName
): Column<TName, "string", false, NullSymbol> {
    return new Column(name, "string", false, nullSymbol);
}

export function number<TName extends string>(
    name: TName
): Column<TName, "number", false, NullSymbol> {
    return new Column(name, "number", false, nullSymbol);
}

export function boolean<TName extends string>(
    name: TName
): Column<TName, "boolean", false, NullSymbol> {
    return new Column(name, "boolean", false, nullSymbol);
}

export function date<TName extends string>(
    name: TName
): Column<TName, "date", false, NullSymbol> {
    return new Column(name, "date", false, nullSymbol);
}

export type InferColumnType<T extends ColumnType> = T extends "string"
    ? string
    : T extends "number"
    ? number
    : T extends "boolean"
    ? boolean
    : T extends "date"
    ? Date
    : never;

export type InferColumn<T> = T extends Column<infer _, infer TType>
    ? InferColumnType<TType>
    : never;

export type InferSelect<T> = T extends Table
    ? {
          [K in keyof T["_"]["schema"]]: InferColumn<T["_"]["schema"][K]>;
      }
    : never;

export type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};

export type OptionalKeyOnly<T extends Column> = T extends Column<
    any,
    any,
    any,
    NullSymbol
>
    ? never
    : T extends Column<infer TName>
    ? TName
    : never;

export type RequiredKeyOnly<T extends Column> = T extends Column<
    infer TName,
    any,
    any,
    NullSymbol
>
    ? TName
    : never;

export type InferInsert<T> = T extends Table
    ? Prettify<
          {
              [K in keyof T["_"]["schema"] as RequiredKeyOnly<
                  T["_"]["schema"][K]
              >]: InferColumn<T["_"]["schema"][K]>;
          } & {
              [K in keyof T["_"]["schema"] as OptionalKeyOnly<
                  T["_"]["schema"][K]
              >]?: InferColumn<T["_"]["schema"][K]>;
          }
      >
    : never;
