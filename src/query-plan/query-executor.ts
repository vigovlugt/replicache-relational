import { ReadTransaction, ReadonlyJSONObject } from "replicache";
import { Filter, FilterValue } from "../filter";
import { Column } from "../schema";
import { deserializeObject, getKey } from "../utils";
import { NestedLoopJoin, PhysicalFilter, PhysicalOperator, Scan } from "./plan";

async function scan(
    op: Scan,
    tx: ReadTransaction
): Promise<Record<string, ReadonlyJSONObject>[]> {
    return (
        (await tx
            .scan({
                prefix: getKey(op.table),
            })
            .values()
            .toArray()) as ReadonlyJSONObject[]
    ).map((row) => ({ [op.table._.name]: deserializeObject(op.table, row) }));
}

async function filter(
    filter: PhysicalFilter,
    tx: ReadTransaction
): Promise<Record<string, ReadonlyJSONObject>[]> {
    const rows = await queryExecutor(filter.input, tx);

    return rows.filter((row) => applyFilter(row, filter.filter));
}

async function nestedLoopJoin(op: NestedLoopJoin, tx: ReadTransaction) {
    const leftRows = await queryExecutor(op.left, tx);
    const rightRows = await queryExecutor(op.right, tx);

    const rows: Record<string, ReadonlyJSONObject>[] = [];
    for (const leftRow of leftRows) {
        let joinedRows = 0;
        for (const rightRow of rightRows) {
            if (applyFilter({ ...leftRow, ...rightRow }, op.on)) {
                rows.push({ ...leftRow, ...rightRow });
                joinedRows++;
            }
        }
        if (op.joinType !== "inner" && joinedRows === 0) {
            rows.push({ ...leftRow });
        }
    }

    return rows;
}

export async function queryExecutor(
    queryPlan: PhysicalOperator,
    tx: ReadTransaction
): Promise<Record<string, ReadonlyJSONObject>[]> {
    switch (queryPlan.type) {
        case "scan":
            return scan(queryPlan, tx);
        case "filter":
            return filter(queryPlan, tx);
        case "nestedLoopJoin":
            return nestedLoopJoin(queryPlan, tx);
        case "search":
            throw new Error("Not implemented");
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
