import "fake-indexeddb/auto";
import { Replicache, TEST_LICENSE_KEY, WriteTransaction } from "replicache";
import { expect, test } from "vitest";
import { eq, and, neq } from "./filter";
import { insert, deleteFrom, select } from "./operations";
import { table, string, number, date, InferInsert, alias } from "./schema";

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
        name: "Jack Doe",
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
            .where(and(eq(users.id, "1"), eq(users.name, "John Doe"))).execute
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

test("Select joins", async () => {
    const replicache = await replicacheFixture();

    const friend = alias(users, "friend");
    const users2 = await replicache.query(
        select().from(users).innerJoin(friend, neq(friend.id, users.id)).execute
    );

    console.log(users2);

    expect(users2.length).toBe(6);
});

test("Triple join", async () => {
    const replicache = await replicacheFixture();

    const friend = alias(users, "friend");
    const friend2 = alias(users, "friend2");

    const users2 = await replicache.query(
        select()
            .from(users)
            .innerJoin(friend, eq(1, 1))
            .innerJoin(friend2, eq(1, 1)).execute
    );

    expect(users2.length).toBe(27);
});

test("Left join", async () => {
    const replicache = await replicacheFixture();

    const friend = alias(users, "friend");
    const users2 = await replicache.query(
        select().from(users).leftJoin(friend, eq(friend.id, "non existant"))
            .execute
    );

    console.log(users2);

    expect(users2.length).toBe(3);
});
