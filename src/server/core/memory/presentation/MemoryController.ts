import { FileSystem, Path } from "@effect/platform";
import { Context, Effect, Layer } from "effect";
import type { ControllerResponse } from "../../../lib/effect/toEffectResponse";
import type { InferEffect } from "../../../lib/effect/types";
import { ApplicationContext } from "../../platform/services/ApplicationContext";

const LayerImpl = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const applicationContext = yield* ApplicationContext;

  const getSessionTitles = () =>
    Effect.gen(function* () {
      const { globalClaudeDirectoryPath } =
        yield* applicationContext.claudeCodePaths;
      const memoryDir = path.resolve(
        globalClaudeDirectoryPath,
        "memory",
        "projects",
      );

      // Check if memory directory exists
      const exists = yield* fs.exists(memoryDir);
      if (!exists) {
        return {
          response: { titles: {} },
          status: 200,
        } as const satisfies ControllerResponse;
      }

      // Scan all project directories
      const projectDirs = yield* fs.readDirectory(memoryDir);
      const titles: Record<string, string> = {};

      for (const projectDir of projectDirs) {
        const sessionsDir = path.resolve(memoryDir, projectDir, "sessions");
        const sessionsDirExists = yield* fs.exists(sessionsDir);
        if (!sessionsDirExists) continue;

        const sessionFiles = yield* fs.readDirectory(sessionsDir);
        for (const file of sessionFiles) {
          if (!file.endsWith(".md")) continue;
          const sessionId = file.replace(/\.md$/, "");
          const filePath = path.resolve(sessionsDir, file);
          const content = yield* fs.readFileString(filePath);

          // Extract title from <!-- title: ... --> comment
          const titleMatch = content.match(/^<!-- title: (.+?) -->/);
          if (titleMatch?.[1]) {
            titles[sessionId] = titleMatch[1];
          }
        }
      }

      return {
        response: { titles },
        status: 200,
      } as const satisfies ControllerResponse;
    });

  return { getSessionTitles };
});

export type IMemoryController = InferEffect<typeof LayerImpl>;
export class MemoryController extends Context.Tag("MemoryController")<
  MemoryController,
  IMemoryController
>() {
  static Live = Layer.effect(this, LayerImpl);
}
