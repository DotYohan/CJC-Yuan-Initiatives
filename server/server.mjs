import { createServer } from "node:http";
import { createApp } from "./app.mjs";

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

const app = await createApp();
const server = createServer(app.handler);

server.listen(app.config.port, app.config.host, () => {
  process.stdout.write(`CJC portal listening at ${app.config.appOrigin}\n`);
});

const shutDown = () => {
  server.close(async () => {
    await app.close();
    process.exit(0);
  });
};

process.once("SIGINT", shutDown);
process.once("SIGTERM", shutDown);
