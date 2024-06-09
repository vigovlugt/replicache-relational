import { and, tablesInFilter } from "../filter";
import { Select } from "../operations/select";
import { LogicalOperator, PhysicalOperator } from "./plan";

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

function findLogicalPlans(select: Select): LogicalOperator[] {
    const joinOrder = select.joins;

    const joined = joinOrder.reduceRight<LogicalOperator>(
        (acc, join) => {
            const joinOp = {
                type: "join",
                joinType: join.type,
                on: join.on,
                left: acc,
                right: {
                    type: "select",
                    table: join.table,
                },
            } satisfies LogicalOperator;
            return joinOp;
        },
        {
            type: "select",
            table: select.table,
        }
    );

    if (select.whereFilter) {
        return [
            {
                type: "filter",
                filter: select.whereFilter,
                input: joined,
            } satisfies LogicalOperator,
        ];
    }

    return [joined];
}

function findPhysicalPlans(logicalPlan: LogicalOperator): PhysicalOperator[] {
    function transform(logicalPlan: LogicalOperator): PhysicalOperator {
        switch (logicalPlan.type) {
            case "select":
                return {
                    type: "scan",
                    table: logicalPlan.table,
                } satisfies PhysicalOperator;
            case "join":
                return {
                    type: "nestedLoopJoin",
                    left: transform(logicalPlan.left),
                    right: transform(logicalPlan.right),
                    joinType: logicalPlan.joinType,
                    on: logicalPlan.on,
                } satisfies PhysicalOperator;
            case "filter":
                return {
                    type: "filter",
                    input: transform(logicalPlan.input),
                    filter: logicalPlan.filter,
                } satisfies PhysicalOperator;
        }
    }

    return [transform(logicalPlan)];
}

// eq(users.id, "1")
// eq("1", users.id)
// eq(users.id, posts.userId)
// and(eq(users.id, "1"), eq(users.name, "john"))
export function queryPlanner(select: Select): PhysicalOperator {
    const logicalPlans = findLogicalPlans(select);
    const physicalPlans = logicalPlans.flatMap(findPhysicalPlans);

    const bestPhysicalPlan = physicalPlans[0];

    return bestPhysicalPlan;
}
