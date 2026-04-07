import dgram from "node:dgram";
import http from "node:http";
import { WebSocketServer } from "ws";

const WS_HOST = "0.0.0.0";
const WS_PORT = 5000;
const WS_PATH = "/mavlink";

const udpSocket = dgram.createSocket("udp4");
let target = null;
let activeClient = null;

const httpServer = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        websocket: `ws://localhost:${WS_PORT}${WS_PATH}`,
        target,
      }),
    );
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

const wss = new WebSocketServer({ noServer: true });

udpSocket.on("message", (message, remoteInfo) => {
  if (!activeClient || activeClient.readyState !== activeClient.OPEN) {
    return;
  }

  activeClient.send(message);
  // console.log("[bridge] udp -> ws", {
  //   bytes: message.length,
  //   from: `${remoteInfo.address}:${remoteInfo.port}`,
  // });
});

udpSocket.on("error", (error) => {
  console.error("[bridge] udp error", error);

  if (activeClient && activeClient.readyState === activeClient.OPEN) {
    activeClient.send(
      JSON.stringify({
        type: "bridge_error",
        message: error.message,
      }),
    );
  }
});

wss.on("connection", (ws, req) => {
  activeClient = ws;
  console.log("[bridge] ws connected", { url: req.url });

  ws.send(
    JSON.stringify({
      type: "bridge_connected",
      websocket: `ws://localhost:${WS_PORT}${WS_PATH}`,
    }),
  );

  ws.on("message", (data, isBinary) => {
    if (isBinary) {
      if (!target) {
        ws.send(
          JSON.stringify({
            type: "bridge_error",
            message: "UDP target is not configured",
          }),
        );
        return;
      }
      // 임시 작업
      udpSocket.send(data, target.port, target.host, (error) => {
        if (error) {
          console.error("[bridge] ws -> udp error", error);
          ws.send(
            JSON.stringify({
              type: "bridge_error",
              message: error.message,
            }),
          );
          return;
        }

        console.log("[bridge] ws -> udp", {
          bytes: data.length,
          target: `${target.host}:${target.port}`,
        });
      });
      return;
    }

    let message;
    try {
      message = JSON.parse(data.toString());
    } catch {
      ws.send(
        JSON.stringify({
          type: "bridge_error",
          message: "Invalid JSON control message",
        }),
      );
      return;
    }

    if (message.type === "set_target") {
      const nextTarget = message.target;

      if (
        !nextTarget ||
        typeof nextTarget.host !== "string" ||
        typeof nextTarget.port !== "number"
      ) {
        ws.send(
          JSON.stringify({
            type: "bridge_error",
            message: "Invalid target payload",
          }),
        );
        return;
      }

      target = {
        host: nextTarget.host,
        port: nextTarget.port,
      };

      console.log("[bridge] target set", target);
      ws.send(
        JSON.stringify({
          type: "target_set_ok",
          target,
        }),
      );
      return;
    }

    if (message.type === "get_status") {
      ws.send(
        JSON.stringify({
          type: "bridge_status",
          target,
        }),
      );
      return;
    }

    ws.send(
      JSON.stringify({
        type: "bridge_error",
        message: `Unsupported control message: ${message.type}`,
      }),
    );
  });

  ws.on("close", (code, reason) => {
    console.log("[bridge] ws closed", {
      code,
      reason: reason.toString(),
    });

    if (activeClient === ws) {
      activeClient = null;
    }
  });

  ws.on("error", (error) => {
    console.error("[bridge] ws error", error);
  });
});

httpServer.on("upgrade", (req, socket, head) => {
  if (req.url !== WS_PATH) {
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

httpServer.listen(WS_PORT, WS_HOST, () => {
  console.log(`[bridge] listening on ws://localhost:${WS_PORT}${WS_PATH}`);
});
