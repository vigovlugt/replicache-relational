import { WriteTransaction } from "replicache";
import { insert, update, select } from "./operations";
import {
    table,
    string,
    number,
    boolean,
    date,
    InferSelect,
    InferInsert,
    RequiredKeyOnly,
    nullSymbol,
    OptionalKeyOnly,
} from "./schema";

const users = table("users", {
    id: string("id").primaryKey(),
    name: string("name"),
    email: string("email"),
    age: number("age"),
    isAdmin: boolean("isAdmin"),
    createdAt: date("createdAt").default(() => new Date()),
});

const tx: WriteTransaction = undefined as any;

await insert(users)
    .values({
        id: "1",
        name: "John Doe",
        email: "john@doe.com",
        age: 42,
        isAdmin: true,
        createdAt: new Date(),
    })
    .execute(tx);

await update(users).set({ name: "John Doe" }).where({ id: "1" }).execute(tx);

const selected = await select().from(users).execute(tx);

// TODO: filters
// TODO: joins
