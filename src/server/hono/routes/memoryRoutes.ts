import { Effect } from "effect";
import { Hono } from "hono";
import { MemoryController } from "../../core/memory/presentation/MemoryController";
import { effectToResponse } from "../../lib/effect/toEffectResponse";
import type { HonoContext } from "../app";
import { getHonoRuntime } from "../runtime";

const memoryRoutes = Effect.gen(function* () {
  const memoryController = yield* MemoryController;
  const runtime = yield* getHonoRuntime;

  return new Hono<HonoContext>().get("/titles", async (c) => {
    const response = await effectToResponse(
      c,
      memoryController.getSessionTitles().pipe(Effect.provide(runtime)),
    );
    return response;
  });
});

export { memoryRoutes };
