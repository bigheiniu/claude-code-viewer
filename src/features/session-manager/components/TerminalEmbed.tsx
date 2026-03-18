import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { type FC, useEffect, useRef } from "react";
import "@xterm/xterm/css/xterm.css";

type ServerMessage =
  | { type: "hello"; sessionId: string; seq: number }
  | { type: "output"; seq: number; data: string }
  | { type: "snapshot"; seq: number; data: string }
  | { type: "exit"; code: number }
  | { type: "pong" };

const buildWsUrl = (options: {
  cwd: string;
  claudeSessionId?: string;
  terminalSessionId?: string;
}) => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const params = new URLSearchParams({
    cwd: options.cwd,
    command: "claude",
  });
  if (options.claudeSessionId) {
    params.set("args", `--resume,${options.claudeSessionId}`);
  }
  if (options.terminalSessionId) {
    params.set("sessionId", options.terminalSessionId);
  }
  return `${protocol}//${window.location.host}/ws/terminal?${params.toString()}`;
};

export const TerminalEmbed: FC<{
  cwd: string;
  claudeSessionId?: string;
  terminalSessionId?: string;
}> = ({ cwd, claudeSessionId, terminalSessionId }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily:
        "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace",
      fontSize: 13,
      theme: {
        background: "#0a0a0a",
        foreground: "#e4e4e7",
        cursor: "#e4e4e7",
        selectionBackground: "#3f3f46",
      },
      convertEol: true,
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(container);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Connect WebSocket
    const url = buildWsUrl({ cwd, claudeSessionId, terminalSessionId });
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      terminal.writeln(
        claudeSessionId
          ? "\x1b[2m Connecting to claude session...\x1b[0m"
          : "\x1b[2m Starting new claude session...\x1b[0m",
      );
    };

    ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(
          typeof event.data === "string" ? event.data : "",
        );
        if (msg.type === "output") {
          terminal.write(msg.data);
        } else if (msg.type === "snapshot") {
          terminal.write(msg.data);
        } else if (msg.type === "hello") {
          terminal.clear();
        } else if (msg.type === "exit") {
          terminal.writeln(
            `\r\n\x1b[2m Session exited (code ${msg.code})\x1b[0m`,
          );
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      terminal.writeln("\r\n\x1b[2m Disconnected\x1b[0m");
    };

    // stdin: user types -> WebSocket -> PTY
    const inputDisposable = terminal.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "input", data }));
      }
    });

    // Resize handler
    const resizeDisposable = terminal.onResize(({ cols, rows }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "resize", cols, rows }));
      }
    });

    // Fit on container resize
    const observer = new ResizeObserver(() => {
      fitAddon.fit();
    });
    observer.observe(container);

    // Ping keepalive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30_000);

    return () => {
      clearInterval(pingInterval);
      observer.disconnect();
      inputDisposable.dispose();
      resizeDisposable.dispose();
      ws.close();
      terminal.dispose();
      terminalRef.current = null;
      wsRef.current = null;
      fitAddonRef.current = null;
    };
  }, [cwd, claudeSessionId, terminalSessionId]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ minHeight: 0 }}
    />
  );
};
