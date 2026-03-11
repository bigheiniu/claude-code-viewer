import { Trans } from "@lingui/react";
import { type FC, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { WorkerView } from "../types";

export interface WorkerFormData {
  name: string;
  description: string;
  projectId: string;
  sessionId: string;
  sessionProcessId: string;
  tags: string;
}

export const CreateWorkerDialog: FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: WorkerFormData) => void;
  isPending: boolean;
  initialData?: WorkerView;
}> = ({ open, onOpenChange, onSubmit, isPending, initialData }) => {
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? "",
  );
  const [projectId, setProjectId] = useState(initialData?.projectId ?? "");
  const [sessionId, setSessionId] = useState(initialData?.sessionId ?? "");
  const [sessionProcessId, setSessionProcessId] = useState(
    initialData?.sessionProcessId ?? "",
  );
  const [tags, setTags] = useState(initialData?.tags.join(", ") ?? "");

  const isEdit = initialData !== undefined;

  const handleSubmit = () => {
    if (name.trim().length === 0) return;
    onSubmit({
      name,
      description,
      projectId,
      sessionId,
      sessionProcessId,
      tags,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? (
              <Trans id="workers.create.title.edit" />
            ) : (
              <Trans id="workers.create.title" />
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>
              <Trans id="workers.create.name" />
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Worker name"
            />
          </div>

          <div>
            <Label>
              <Trans id="workers.create.description" />
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Worker description"
            />
          </div>

          <div>
            <Label>
              <Trans id="workers.create.project_id" />
            </Label>
            <Input
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="Project ID"
            />
          </div>

          <div>
            <Label>
              <Trans id="workers.create.session_id" />
            </Label>
            <Input
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="Session ID (optional)"
            />
          </div>

          <div>
            <Label>
              <Trans id="workers.create.process_id" />
            </Label>
            <Input
              value={sessionProcessId}
              onChange={(e) => setSessionProcessId(e.target.value)}
              placeholder="Session Process ID (optional)"
            />
          </div>

          <div>
            <Label>
              <Trans id="workers.create.tags" />
            </Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Tags (comma-separated)"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={isPending || name.trim().length === 0}
          >
            {isPending ? (
              "..."
            ) : isEdit ? (
              <Trans id="workers.create.save" />
            ) : (
              <Trans id="workers.create.submit" />
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
