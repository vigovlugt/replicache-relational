import {
    WriteTransaction,
    ReadTransaction,
    ReadonlyJSONObject,
} from "replicache";
import { Table, InferInsert, InferSelect, nullSymbol } from "./schema";
import {
    serializeObjects,
    getKey,
    serializeObject,
    deserializeObjects,
} from "./utils";
import { queryExecutor, queryPlanner } from "./query-planner";
import { Filter } from "./filter";

function applyDefaults<T extends Table>(table: T, value: InferInsert<T>) {
    return Object.fromEntries(
        Object.entries(value).map(([key, value]) => {
            const column = table._.schema[key];
            if (column.defaultValue !== nullSymbol) {
                if (typeof column.defaultValue === "function") {
                    return [key, column.defaultValue()];
                }
                return [key, column.defaultValue];
            }
            return [key, value];
        })
    );
}

export function insert<T extends Table>(table: T) {
    return {
        values(value: InferInsert<T> | InferInsert<T>[]) {
            // TODO: onconflict
            return {
                async execute(tx: WriteTransaction) {
                    const values = Array.isArray(value) ? value : [value];

                    const valuesWithDefaults = values.map((value) =>
                        applyDefaults(table, value)
                    ) as InferInsert<T>[];

                    const serializedValues = serializeObjects(
                        table,
                        valuesWithDefaults
                    );
                    for (const value of serializedValues) {
                        const key = getKey(table, value);
                        await tx.set(key, value);
                    }
                },
            };
        },
    };
}

export function update<T extends Table>(table: T) {
    return {
        set(value: Partial<InferInsert<T>>) {
            async function executeFn(tx: WriteTransaction, where?: Filter) {
                const queryPlan = queryPlanner([table], where);
                const updateRows = await queryExecutor(queryPlan, tx);
                const serializedValue = serializeObject(table, value);
                for await (const existingValue of updateRows) {
                    const newValue = {
                        existingValue,
                        ...serializedValue,
                    };

                    const newKey = getKey(table, newValue);
                    const oldKey = getKey(table, existingValue);
                    if (newKey !== oldKey) {
                        await tx.del(oldKey);
                    }

                    await tx.set(getKey(table, existingValue), newValue);
                }
            }

            return {
                async execute(tx: WriteTransaction) {
                    return await executeFn(tx);
                },
                where(where: any) {
                    return {
                        async execute(tx: WriteTransaction) {
                            return await executeFn(tx, where);
                        },
                    };
                },
            };
        },
    };
}

export function select() {
    return {
        from<T extends Table>(table: T) {
            const buildExecute = (table: T, where?: Filter) => {
                return async (tx: ReadTransaction) => {
                    const queryPlan = queryPlanner([table], where);
                    const result = await queryExecutor(queryPlan, tx);

                    return deserializeObjects(
                        table,
                        result
                    ) as InferSelect<T>[];
                };
            };

            return {
                execute: buildExecute(table),
                where(where: Filter) {
                    return {
                        execute: buildExecute(table, where),
                    };
                },
            };
        },
    };
}

export function deleteFrom<T extends Table>(table: T) {
    async function executeFn(tx: WriteTransaction, where?: Filter) {
        const queryPlan = queryPlanner([table], where);
        const updateRows = await queryExecutor(queryPlan, tx);
        for await (const existingValue of updateRows) {
            const key = getKey(table, existingValue);
            await tx.del(key);
        }
    }

    return {
        async execute(tx: WriteTransaction) {
            return await executeFn(tx);
        },
        where(where: Filter) {
            return {
                async execute(tx: WriteTransaction) {
                    return await executeFn(tx, where);
                },
            };
        },
    };
}
