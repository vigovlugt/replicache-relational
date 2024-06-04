import { Filter } from "../filter";
import { Table } from "../schema";

export type QueryPlan = {
    children: QueryPlanAction[];
    filter: Filter | undefined;
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

export type MultiIndexOr = {
    type: "multi-index-or";
    table: Table;
    indexes: string[];
    eq: string;
};

export type QueryPlanAction = Search | Scan;

// Steps: for join, get all scans and searches, sort by searches top, then scans
// Except if the scan depends on the search, then the scan must be below the search
// EXPLAIN QUERY PLAN SELECT * FROM users a INNER JOIN users b ON a.name = b.name;
// QUERY PLAN
// |--SCAN TABLE users AS a
// `--SEARCH TABLE users AS b USING INDEX user_names (name=?)
