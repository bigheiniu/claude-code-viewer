import { Layer } from "effect";
import { WorkerRegistry } from "./infrastructure/WorkerRegistry";
import { WorkerController } from "./presentation/WorkerController";
import { WorkerDispatchService } from "./services/WorkerDispatchService";
import { WorkerStatusService } from "./services/WorkerStatusService";

export { WorkerRegistry } from "./infrastructure/WorkerRegistry";
export { WorkerController } from "./presentation/WorkerController";
export { WorkerDispatchService } from "./services/WorkerDispatchService";
export { WorkerStatusService } from "./services/WorkerStatusService";

export const WorkerLayer = Layer.mergeAll(
  WorkerRegistry.Live,
  WorkerStatusService.Live,
  WorkerDispatchService.Live,
  WorkerController.Live,
);
