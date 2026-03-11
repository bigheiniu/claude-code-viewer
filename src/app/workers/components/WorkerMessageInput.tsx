import { Trans } from "@lingui/react";
import { SendIcon } from "lucide-react";
import { type FC, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const WorkerMessageInput: FC<{
  onSend: (message: string) => void;
  disabled: boolean;
  isPending: boolean;
}> = ({ onSend, disabled, isPending }) => {
  const [message, setMessage] = useState("");

  const handleSubmit = () => {
    const trimmed = message.trim();
    if (trimmed.length === 0) return;
    onSend(trimmed);
    setMessage("");
  };

  return (
    <div className="border-t pt-4">
      <p className="text-sm text-muted-foreground mb-2">
        <Trans id="workers.detail.send_message" />
      </p>
      <div className="flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message…"
          disabled={disabled || isPending}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <Button
          onClick={handleSubmit}
          disabled={disabled || isPending || message.trim().length === 0}
        >
          <SendIcon className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
