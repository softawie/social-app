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

// Add the root route before bootstrapping
app.get("/", (req, res) => res.send("Hello World!"));

// Bootstrap the application (this will initialize Socket.IO)
const init = async () => {
  try {
    await bootstrap(app);
    
    // Use the HTTP server created by Socket.IO gateway if available, otherwise use Express
    const server = (app as any).httpServer || app;
    
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} is already in use. Please stop other processes or use a different port.`);
        console.log('💡 Try running: lsof -ti:3000 | xargs kill -9');
        process.exit(1);
      } else {
        console.error('❌ Server error:', error);
        process.exit(1);
      }
    });
    
    server.listen(port, () => {
      console.log(`🚀 Server listening on port ${port}!`);
      console.log(`📡 Socket.IO ready for connections`);
      console.log(`🌐 Test page: http://localhost:${port}/socket-test`);
    });
    
  } catch (error) {
    console.error('❌ Failed to initialize server:', error);
    process.exit(1);
  }
};

init();
