import { ReadTransaction, ReadonlyJSONObject } from "replicache";
import { Filter, FilterValue } from "./filter";
import { Column, Table } from "./schema";
import { getKey } from "./utils";

// eq(users.id, "1")
// eq("1", users.id)
// eq(users.id, posts.userId)
// and(eq(users.id, "1"), eq(users.name, "john"))
export function queryPlanner(
    tables: Table[],
    filter: Filter | undefined
): QueryPlan {
    return {
        type: "scan",
        table: tables[0],
        filter: filter,
    };
}

export type QueryPlan = {
    type: "scan";
    table: Table;
    filter: Filter | undefined;
};

export async function queryExecutor(queryPlan: QueryPlan, tx: ReadTransaction) {
    switch (queryPlan.type) {
        case "scan":
            const { table, filter } = queryPlan;

            const tableRows = new Map<Table, ReadonlyJSONObject[]>();
            tableRows.set(
                table,
                (await tx
                    .scan({
                        prefix: getKey(table),
                    })
                    .values()
                    .toArray()) as ReadonlyJSONObject[]
            );

            if (filter === undefined) {
                return tableRows.get(table)!;
            }

            return tableRows
                .get(table)!
                .filter((row) => applyFilter({ [table._.name]: row }, filter));
    }
}

function getValue(
    row: Record<string, ReadonlyJSONObject>,
    value: FilterValue
): string | number | boolean | null | Date {
    if (value instanceof Column) {
        const val = row[value.table!._.name]![value.name!] as
            | string
            | number
            | boolean
            | null;
        if (value.type === "date" && val !== null) {
            return new Date(val as string);
        }

        return val;
    }

    return value as string | number | boolean | null;
}

function applyFilter(row: Record<string, ReadonlyJSONObject>, filter: Filter) {
    switch (filter.type) {
        case "binop":
            const { left, right } = filter;
            const leftValue = getValue(row, left);
            const rightValue = getValue(row, right);
            if (leftValue === null || rightValue === null) {
                switch (filter.op) {
                    case "eq":
                        return leftValue === rightValue;
                    case "neq":
                        return leftValue !== rightValue;
                    default:
                        return false;
                }
            }

            switch (filter.op) {
                case "eq":
                    return leftValue === rightValue;
                case "neq":
                    return leftValue !== rightValue;
                case "lt":
                    return leftValue < rightValue;
                case "lte":
                    return leftValue <= rightValue;
                case "gt":
                    return leftValue > rightValue;
                case "gte":
                    return leftValue >= rightValue;
            }
        case "and":
            return filter.filters.every((c) => applyFilter(row, c));
        case "or":
            return filter.filters.some((c) => applyFilter(row, c));
    }
}
