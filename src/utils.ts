import { ReadonlyJSONObject } from "replicache";
import { Table, InferInsert } from "./schema";

export function serializeObject<TTable extends Table>(
    table: TTable,
    value: Partial<InferInsert<TTable>>
) {
    return Object.fromEntries(
        Object.entries(value).map(([column, v]) => {
            if (v instanceof Date && table._.schema[column].type === "date") {
                return [column, v.toISOString()];
            }

            return [column, v];
        })
    );
}

export function serializeObjects<TTable extends Table>(
    table: TTable,
    values: InferInsert<TTable> | InferInsert<TTable>[]
) {
    values = Array.isArray(values) ? values : [values];
    return values.map((value) => serializeObject(table, value));
}

export function deserializeObject<TTable extends Table>(
    table: TTable,
    value: ReadonlyJSONObject
) {
    return Object.fromEntries(
        Object.entries(value).map(([column, v]) => {
            if (table._.schema[column].type === "date") {
                return [column, new Date(v as string)];
            }

            return [column, v];
        })
    );
}

export function deserializeObjects<TTable extends Table>(
    table: TTable,
    values: ReadonlyJSONObject[] | ReadonlyJSONObject
) {
    values = Array.isArray(values) ? values : [values];
    return values.map((value) => deserializeObject(table, value));
}

export function getKey<TTable extends Table>(
    table: TTable,
    value?: ReadonlyJSONObject
) {
    if (value === undefined) {
        return table._.name + "/";
    }

    return [table._.name, ...table._.primaryKeys.map((key) => value[key])].join(
        "/"
    );
}
