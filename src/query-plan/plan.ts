import { Filter } from "../filter";
import { Table } from "../schema";

export type LogicalOperator =
    | {
          type: "select";
          table: Table;
      }
    | {
          type: "join";
          joinType: "inner" | "left";
          right: LogicalOperator;
          left: LogicalOperator;
          on: Filter;
      }
    | {
          type: "filter";
          filter: Filter;
          input: LogicalOperator;
      };

export type Scan = {
    type: "scan";
    table: Table;
};

export type Search = {
    type: "search";
    table: Table;
    // index: Index
    eq: string;
};

export type NestedLoopJoin = {
    type: "nestedLoopJoin";
    left: PhysicalOperator;
    right: PhysicalOperator;
    joinType: "inner" | "left";
    on: Filter;
};

export type PhysicalFilter = {
    type: "filter";
    input: PhysicalOperator;
    filter: Filter;
};

export type PhysicalOperator = Search | Scan | PhysicalFilter | NestedLoopJoin;

// Steps: for join, get all scans and searches, sort by searches top, then scans
// Except if the scan depends on the search, then the scan must be below the search
// EXPLAIN QUERY PLAN SELECT * FROM users a INNER JOIN users b ON a.name = b.name;
// QUERY PLAN
// |--SCAN TABLE users AS a
// `--SEARCH TABLE users AS b USING INDEX user_names (name=?)
