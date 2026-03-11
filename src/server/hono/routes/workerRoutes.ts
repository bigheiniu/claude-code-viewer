import { zValidator } from "@hono/zod-validator";
import { Effect } from "effect";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import {
  workerCreateSchema,
  workerMessageSchema,
  workerUpdateSchema,
} from "../../core/worker/models/Worker";
import { WorkerController } from "../../core/worker/presentation/WorkerController";
import { WorkerDispatchService } from "../../core/worker/services/WorkerDispatchService";
import { effectToResponse } from "../../lib/effect/toEffectResponse";
import type { HonoContext } from "../app";
import { getHonoRuntime } from "../runtime";

type ErrorResponse = {
  response: { error: string };
  status: ContentfulStatusCode;
};

const toErrorResponse = (error: unknown): Effect.Effect<ErrorResponse> => {
  if (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    typeof error._tag === "string"
  ) {
    if (error._tag === "WorkerNotFoundError") {
      return Effect.succeed({
        response: { error: "Worker not found" },
        status: 404,
      });
    }
    if (error._tag === "WorkerNoActiveProcessError") {
      return Effect.succeed({
        response: { error: "Worker has no active process" },
        status: 400,
      });
    }
  }
  return Effect.succeed({
    response: { error: "Internal server error" },
    status: 500,
  });
};

const workerRoutes = Effect.gen(function* () {
  const workerController = yield* WorkerController;
  const workerDispatchService = yield* WorkerDispatchService;
  const runtime = yield* getHonoRuntime;

  return new Hono<HonoContext>()
    .get("/", async (c) => {
      const response = await effectToResponse(
        c,
        workerController.listWorkers().pipe(Effect.provide(runtime)),
      );
      return response;
    })
    .post("/", zValidator("json", workerCreateSchema), async (c) => {
      const response = await effectToResponse(
        c,
        workerController
          .createWorker(c.req.valid("json"))
          .pipe(Effect.provide(runtime)),
      );
      return response;
    })
    .get("/discover", async (c) => {
      return c.json({ candidates: [] }, 200);
    })
    .get("/:id", async (c) => {
      const response = await effectToResponse(
        c,
        workerController
          .getWorker(c.req.param("id"))
          .pipe(Effect.provide(runtime)),
      );
      return response;
    })
    .put("/:id", zValidator("json", workerUpdateSchema), async (c) => {
      const response = await effectToResponse(
        c,
        workerController
          .updateWorker(c.req.param("id"), c.req.valid("json"))
          .pipe(Effect.provide(runtime)),
      );
      return response;
    })
    .delete("/:id", async (c) => {
      const response = await effectToResponse(
        c,
        workerController
          .deleteWorker(c.req.param("id"))
          .pipe(Effect.provide(runtime)),
      );
      return response;
    })
    .post(
      "/:id/message",
      zValidator("json", workerMessageSchema),
      async (c) => {
        const { message } = c.req.valid("json");
        const response = await effectToResponse(
          c,
          workerDispatchService.sendMessage(c.req.param("id"), message).pipe(
            Effect.map(
              (): {
                response: { success: boolean };
                status: ContentfulStatusCode;
              } => ({
                response: { success: true },
                status: 200,
              }),
            ),
            Effect.catchAll(toErrorResponse),
            Effect.provide(runtime),
          ),
        );
        return response;
      },
    )
    .post("/:id/abort", async (c) => {
      const response = await effectToResponse(
        c,
        workerDispatchService.abortWorker(c.req.param("id")).pipe(
          Effect.map(
            (): {
              response: { success: boolean };
              status: ContentfulStatusCode;
            } => ({
              response: { success: true },
              status: 200,
            }),
          ),
          Effect.catchAll(toErrorResponse),
          Effect.provide(runtime),
        ),
      );
      return response;
    });
});

export { workerRoutes };
