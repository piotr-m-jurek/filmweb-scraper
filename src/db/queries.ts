import { Context, Effect, Layer } from "effect";
import { DB, db } from "./client.js";

interface Interface {
	use(db: DB): Effect.Effect<unknown>
}
export class DatabaseService extends Context.Service<DatabaseService, Interface>()("@/DatabaseService") {}

export const layer = Layer.effect(DatabaseService, Effect.gen(function* {

	return {use(db)}

}))
