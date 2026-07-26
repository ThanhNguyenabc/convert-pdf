import express from "express";
import bodyParser from "body-parser";
import { cpus } from "os";
import cors from "cors";
import router from "./route";
import { PORT } from "./constants";
import cluster from "cluster";
import "./cluster_manager";
require("dotenv").config();

// const os = cpus().length;

const createApplication = async () => {
  const app = express();
  app.use(cors());
  app.use(express.static("public"));
  app.use(bodyParser.json({ limit: "100mb" }));
  app.use(bodyParser.urlencoded({ limit: "100mb", extended: true }));
  app.use("/", router);

  app.listen(PORT, () => {
    console.log("Server running on port ", PORT);
  });
};

// console.log("env:::", process.env.NODE_ENV);

createApplication();

// if (cluster.isPrimary) {
//   for (let i = 0; i < os; i++) {
//     cluster.fork();
//   }
//   cluster.on("exit", (worker) => {
//     console.log(`The Worker number: ${worker.id} has died`);
//   });
// } else {
//   createApplication();
// }

// setInterval(() => {
//   const m = process.memoryUsage();

//   const heapUsed = Math.round(m.heapUsed / 1024 / 1024);
//   console.log({
//     rss: Math.round(m.rss / 1024 / 1024),
//     heapUsed: heapUsed,
//     total: m.heapTotal,
//     external: Math.round(m.external / 1024 / 1024),
//   });
// }, 5000);
