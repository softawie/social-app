import morgan from "morgan";
import fs from "node:fs";
import { Express, Router } from "express";
import path from "node:path";

const projectRoot = path.resolve();

export const getRouteLogger = (
  app: Express,
  routePath: string,
  router: Router,
  logsFileName: string
) => {
  const logStream = fs.createWriteStream(
    path.join(projectRoot, "src/logs", logsFileName),
    { flags: "a" }
  );
  app.use(routePath, morgan("combined", { stream: logStream }), router);
  app.use(routePath, morgan("dev"), router);
};
