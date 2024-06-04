import { WriteTransaction, ReadonlyJSONObject } from "replicache";
import { Table, InferInsert, nullSymbol } from "../schema";
import { serializeObjects, getKey, serializeObject } from "../utils";
import { Filter } from "../filter";
import { select } from "./select";

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
                let selectStmt = select().from(table);
                if (where) {
                    selectStmt = selectStmt.where(where);
                }

                const updateRows = await selectStmt.execute(tx);

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
                where(where: Filter) {
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

export function deleteFrom<T extends Table>(table: T) {
    async function executeFn(tx: WriteTransaction, where?: Filter) {
        let selectStmt = select().from(table);
        if (where) {
            selectStmt = selectStmt.where(where);
        }

        const rowsToDelete = (await selectStmt.execute(
            tx
        )) as ReadonlyJSONObject[];

        for await (const row of rowsToDelete) {
            const key = getKey(table, row);
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
