import "fake-indexeddb/auto";
import { Replicache, TEST_LICENSE_KEY, WriteTransaction } from "replicache";
import { InferInsert, date, number, string, table } from "./schema";
import { expect, test } from "vitest";
import { deleteFrom, insert, select } from "./operations";
import { and, eq, neq } from "./filter";

const users = table("users", {
    id: string("id").primaryKey(),
    name: string("name"),
    age: number("age"),
    createdAt: date("createdAt").default(() => new Date()),
});

async function replicacheFixture() {
    const rep = new Replicache({
        licenseKey: TEST_LICENSE_KEY,
        name: crypto.randomUUID(),
        mutators: {
            async createUser(
                tx: WriteTransaction,
                args: InferInsert<typeof users>
            ) {
                await insert(users).values(args).execute(tx);
            },
            async deleteUser(tx: WriteTransaction, args: string) {
                await deleteFrom(users).where(eq(users.id, args)).execute(tx);
            },
        },
    });

    await rep.mutate.createUser({
        id: "1",
        name: "John Doe",
        age: 42,
    });
    await rep.mutate.createUser({
        id: "2",
        name: "Jane Doe",
        age: 42,
    });
    await rep.mutate.createUser({
        id: "3",
        name: "John Doe",
        age: 42,
    });

    return rep;
}

test("Insert and select", async () => {
    const replicache = await replicacheFixture();

    const userList = await replicache.query(select().from(users).execute);

    expect(userList.length).toBe(3);
});

test("Insert and select with where", async () => {
    const replicache = await replicacheFixture();

    const userList = await replicache.query(
        select().from(users).where(eq(users.id, "1")).execute
    );

    expect(userList.length).toBe(1);
});

test("Insert and select with advanced where", async () => {
    const replicache = await replicacheFixture();

    const userList = await replicache.query(
        select()
            .from(users)
            .where(and(neq(users.id, "1"), eq(users.name, "John Doe"))).execute
    );

    expect(userList.length).toBe(1);
});

test("Delete", async () => {
    const replicache = await replicacheFixture();

    const userList = await replicache.query(
        select().from(users).where(eq(users.id, "1")).execute
    );

    expect(userList.length).toBe(1);

    await replicache.mutate.deleteUser("1");

    const userList2 = await replicache.query(
        select().from(users).where(eq(users.id, "1")).execute
    );

    expect(userList2.length).toBe(0);
});
