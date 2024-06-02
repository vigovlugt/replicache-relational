import { Column, ColumnType, InferColumnType } from "./schema";

export type Filter =
    | {
          type: "binop";
          op: "eq" | "neq" | "lt" | "lte" | "gt" | "gte";
          left: Column | string | number | boolean | Date;
          right: Column | string | number | boolean | Date;
      }
    | {
          type: "and";
          filters: Filter[];
      }
    | {
          type: "or";
          filters: Filter[];
      };

export type FilterValue = Column | string | number | boolean | Date;

export function eq<TValue extends FilterValue>(
    left: TValue,
    right: TValue
): Filter;
export function eq<TColumn extends Column>(
    left: TColumn,
    right: TColumn extends Column<any, infer TColumnType>
        ? Column<any, TColumnType>
        : never
): Filter;
export function eq<TColumn extends Column>(
    left: TColumn,
    right: TColumn extends Column<any, infer TColumnType>
        ? InferColumnType<TColumnType>
        : never
): Filter;
export function eq<TColumn extends Column>(
    left: TColumn extends Column<any, infer TColumnType>
        ? InferColumnType<TColumnType>
        : never,
    right: TColumn
): Filter;
export function eq(left: FilterValue, right: FilterValue): Filter {
    return {
        type: "binop",
        op: "eq",
        left,
        right,
    };
}

export function neq<TValue extends FilterValue>(
    left: TValue,
    right: TValue
): Filter;
export function neq<TColumn extends Column>(
    left: TColumn,
    right: TColumn extends Column<any, infer TColumnType>
        ? Column<any, TColumnType>
        : never
): Filter;
export function neq<TColumn extends Column>(
    left: TColumn,
    right: TColumn extends Column<any, infer TColumnType>
        ? InferColumnType<TColumnType>
        : never
): Filter;
export function neq<TColumn extends Column>(
    left: TColumn extends Column<any, infer TColumnType>
        ? InferColumnType<TColumnType>
        : never,
    right: TColumn
): Filter;
export function neq(left: FilterValue, right: FilterValue): Filter {
    return {
        type: "binop",
        op: "neq",
        left,
        right,
    };
}

export function lt<TValue extends FilterValue>(
    left: TValue,
    right: TValue
): Filter;
export function lt<TColumn extends Column>(
    left: TColumn,
    right: TColumn extends Column<any, infer TColumnType>
        ? Column<any, TColumnType>
        : never
): Filter;
export function lt<TColumn extends Column>(
    left: TColumn,
    right: TColumn extends Column<any, infer TColumnType>
        ? InferColumnType<TColumnType>
        : never
): Filter;
export function lt<TColumn extends Column>(
    left: TColumn extends Column<any, infer TColumnType>
        ? InferColumnType<TColumnType>
        : never,
    right: TColumn
): Filter;
export function lt(left: FilterValue, right: FilterValue): Filter {
    return {
        type: "binop",
        op: "lt",
        left,
        right,
    };
}

export function lte<TValue extends FilterValue>(
    left: TValue,
    right: TValue
): Filter;
export function lte<TColumn extends Column>(
    left: TColumn,
    right: TColumn extends Column<any, infer TColumnType>
        ? Column<any, TColumnType>
        : never
): Filter;
export function lte<TColumn extends Column>(
    left: TColumn,
    right: TColumn extends Column<any, infer TColumnType>
        ? InferColumnType<TColumnType>
        : never
): Filter;
export function lte<TColumn extends Column>(
    left: TColumn extends Column<any, infer TColumnType>
        ? InferColumnType<TColumnType>
        : never,
    right: TColumn
): Filter;
export function lte(left: FilterValue, right: FilterValue): Filter {
    return {
        type: "binop",
        op: "lte",
        left,
        right,
    };
}

export function gt<TValue extends FilterValue>(
    left: TValue,
    right: TValue
): Filter;
export function gt<
    TColumnType extends ColumnType,
    TColumn extends Column<string, TColumnType>,
    TColumnRight extends Column<string, TColumnType>
>(left: TColumn, right: TColumnRight): Filter;
export function gt<
    TColumnType extends ColumnType,
    TType extends InferColumnType<TColumnType>,
    TColumn extends Column<string, TColumnType>
>(left: TColumn, right: TType): Filter;
export function gt<
    TColumnType extends ColumnType,
    TType extends InferColumnType<TColumnType>,
    TColumn extends Column<string, TColumnType>
>(left: TType, right: TColumn): Filter;
export function gt(left: FilterValue, right: FilterValue): Filter {
    return {
        type: "binop",
        op: "gt",
        left,
        right,
    };
}

export function gte<TValue extends FilterValue>(
    left: TValue,
    right: TValue
): Filter;
export function gte<TColumn extends Column>(
    left: TColumn,
    right: TColumn extends Column<any, infer TColumnType>
        ? Column<any, TColumnType>
        : never
): Filter;
export function gte<TColumn extends Column>(
    left: TColumn,
    right: TColumn extends Column<any, infer TColumnType>
        ? InferColumnType<TColumnType>
        : never
): Filter;
export function gte<TColumn extends Column>(
    left: TColumn extends Column<any, infer TColumnType>
        ? InferColumnType<TColumnType>
        : never,
    right: TColumn
): Filter;
export function gte(left: FilterValue, right: FilterValue): Filter {
    return {
        type: "binop",
        op: "gte",
        left,
        right,
    };
}

export function and(...filters: Filter[]): Filter {
    return {
        type: "and",
        filters,
    };
}

export function or(...filters: Filter[]): Filter {
    return {
        type: "or",
        filters,
    };
}
