import { ReadTransaction, ReadonlyJSONObject } from "replicache";
import { Filter, FilterValue, and, tablesInFilter } from "../filter";
import { Column } from "../schema";
import { getKey } from "../utils";
import { Select } from "../operations/select";
import { QueryPlan, QueryPlanAction } from "./plan";

export function validateQuery(select: Select) {
    const tables = [select.table, ...select.joins.map((j) => j.table)];
    const filterTables = [
        ...tablesInFilter(select.whereFilter),
        ...select.joins.flatMap((j) => tablesInFilter(j.on)),
    ];
    for (const fTable of filterTables) {
        if (!tables.includes(fTable)) {
            throw new Error(`Table ${fTable._.name} not in query`);
        }
    }
}

// eq(users.id, "1")
// eq("1", users.id)
// eq(users.id, posts.userId)
// and(eq(users.id, "1"), eq(users.name, "john"))
export function queryPlanner(select: Select): QueryPlan {
    const filter = [
        ...(select.whereFilter ? [select.whereFilter] : []),
        // TODO: may only be correct for inner not outer joins?
        ...select.joins.map((j) => j.on),
    ];

    return {
        children: [
            {
                type: "scan",
                table: select.table,
            },
            ...select.joins.map(
                (join) =>
                    ({
                        type: "scan",
                        table: join.table,
                    } as const)
            ),
        ],
        filter: and(...filter),
    };
}

async function getRows(action: QueryPlanAction, tx: ReadTransaction) {
    switch (action.type) {
        case "scan":
            return (await tx
                .scan({
                    prefix: getKey(action.table),
                })
                .values()
                .toArray()) as ReadonlyJSONObject[];
    }

    return [];

    // TODO: implement index scan;
    // action.type satisfies never;
}

function filteredRows(
    rows: Record<string, ReadonlyJSONObject>[],
    filter: Filter | undefined
): Record<string, ReadonlyJSONObject>[] {
    if (!filter) {
        return rows;
    }
    return rows.filter((row) => applyFilter(row, filter));
}

export async function queryExecutor(queryPlan: QueryPlan, tx: ReadTransaction) {
    const firstAction = queryPlan.children[0];
    let rows = (await getRows(firstAction, tx)).map((row) => ({
        [firstAction.table._.name]: row,
    }));

    if (queryPlan.children.length === 1) {
        return filteredRows(rows, queryPlan.filter);
    }

    for (const child of queryPlan.children.slice(1)) {
        const newRows: Record<string, ReadonlyJSONObject>[] = [];
        const childRows = await getRows(child, tx);

        for (const row of rows) {
            // If indexed lookup, childRows should be calculated here

            for (const childRow of childRows) {
                newRows.push({
                    ...row,
                    [child.table._.name]: childRow,
                });
            }

            rows = newRows;
        }
    }

    return filteredRows(rows, queryPlan.filter);
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
