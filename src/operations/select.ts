import { ReadTransaction } from "replicache";
import { Filter } from "../filter";
import { queryPlanner, queryExecutor, validateQuery } from "../query-plan/";
import { InferSelect, Table } from "../schema";
import { Prettify, deserializeObjects } from "../utils";

export type JoinType = "inner" | "left"; // | "right" | "full";

type Join<TType extends JoinType = JoinType, TTable extends Table = Table> = {
    type: TType;
    table: TTable;
    on: Filter;
};

// TODO: group by
export class Select<
    TTable extends Table = Table,
    TJoins extends Array<Join> = Array<Join>
> {
    // @internal
    public table: TTable;
    // @internal
    public joins: TJoins = [] as any;
    // @internal
    public whereFilter: Filter | undefined;

    constructor(table: TTable) {
        this.table = table;

        this.execute = this.execute.bind(this);
    }

    leftJoin<TJoinTable extends Table>(
        table: TJoinTable,
        on: Filter
    ): Select<TTable, [...TJoins, Join<"left", TJoinTable>]> {
        this.joins.push({
            type: "left",
            table,
            on,
        });

        return this as any;
    }

    innerJoin<TJoinTable extends Table>(
        table: TJoinTable,
        on: Filter
    ): Select<TTable, [...TJoins, Join<"inner", TJoinTable>]> {
        this.joins.push({
            type: "inner",
            table,
            on,
        });

        return this as any;
    }

    where(filter: Filter) {
        this.whereFilter = filter;

        return this;
    }

    async execute(tx: ReadTransaction): Promise<SelectResult<this>> {
        // TODO: cache this
        validateQuery(this);
        const queryPlan = queryPlanner(this);
        const result = await queryExecutor(queryPlan, tx);
        if (this.joins.length === 0) {
            // TODO: new deserializeObjects
            return deserializeObjects(
                this.table,
                result.map((obj) => obj[this.table._.name])
            ) as SelectResult<this>;
        }

        return result as SelectResult<this>;
        // TODO: new deserializeObjects
        // return deserializeObjects(this.table, result) as SelectResult<this>;
    }
}

export type SelectResult<T> = T extends Select<infer TTable, infer TJoins>
    ? [] extends TJoins
        ? InferSelect<TTable>[]
        : Prettify<
              {
                  [K in TJoins[number] as K["table"]["_"]["name"]]: InferSelect<
                      K["table"]
                  >;
              } & {
                  [K in TTable["_"]["name"]]: InferSelect<TTable>;
              }
          >[]
    : never;

export function select() {
    return {
        from<T extends Table>(table: T): Select<T, []> {
            return new Select(table);
        },
    };
}

const x = [1, 2, 3] as const;

type X = (typeof x)[number];
