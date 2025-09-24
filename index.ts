import express from "express";
import { bootstrap } from "./src/app.controller";
import { config } from "dotenv";
import { EnvEnum } from "./src/utils/enums";
import path from "node:path";

config({ path: path.resolve('.env') });

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV?: EnvEnum;
    }
  }
}

const app = express();
const port: number = parseInt(process.env.PORT || '3000');
bootstrap(app);

app.get("/", (req, res) => res.send("Hello World!"));
app.listen(port, () => console.log(`Example app listening on port ${port}!`));
