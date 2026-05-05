import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

type ChainAction = "select" | "insert" | "update" | "delete";

function createInMemoryDb() {
  function makeChain(action: ChainAction) {
    let lastValues: unknown[] = [];
    const chain: Record<string, unknown> = {
      from: () => chain,
      where: () => chain,
      set: (data: unknown) => {
        lastValues = [data];
        return chain;
      },
      values: (data: unknown) => {
        lastValues = Array.isArray(data) ? (data as unknown[]) : [data];
        return chain;
      },
      onConflictDoUpdate: () => chain,
      onConflictDoNothing: () => chain,
      returning: () =>
        Promise.resolve(
          action === "insert" || action === "update" ? lastValues : [],
        ),
      then: (onF: (v: unknown[]) => unknown, onR?: (e: unknown) => unknown) =>
        Promise.resolve([] as unknown[]).then(onF, onR),
      catch: (onR: (e: unknown) => unknown) =>
        Promise.resolve([] as unknown[]).catch(onR),
      finally: (onF: () => void) =>
        Promise.resolve([] as unknown[]).finally(onF),
    };
    return chain;
  }
  return {
    select: () => makeChain("select"),
    insert: (_table: unknown) => makeChain("insert"),
    update: (_table: unknown) => makeChain("update"),
    delete: (_table: unknown) => makeChain("delete"),
  };
}

let pool: pg.Pool | null = null;
let db: ReturnType<typeof drizzle<typeof schema>>;

if (process.env.DATABASE_URL) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
} else {
  console.warn(
    "[db] DATABASE_URL not set — falling back to in-memory stub (no persistence).",
  );
  db = createInMemoryDb() as unknown as ReturnType<
    typeof drizzle<typeof schema>
  >;
}

export { pool, db };
export * from "./schema";
