import express from "express";
import bodyParser from "body-parser";
import cluster from "cluster";
import { cpus } from "os";
import cors from "cors";
import router from "./route";
import { PORT } from "./constants";
require("dotenv").config();

const os = cpus().length;

const createApplication = () => {
  const app = express();
  app.use(cors());
  app.use(express.static("public"));
  app.use(bodyParser.json({ limit: "100mb" }));
  app.use(bodyParser.urlencoded({ limit: "100mb", extended: true }));
  app.use("/", router);

  app.listen(PORT, async () => {
    console.log(`Server started on host : ${PORT}`);
  });
};

if (cluster.isPrimary && process.env.NODE_ENV === "production") {
  for (let i = 0; i < os; i++) {
    cluster.fork();
  }
  cluster.on("exit", (worker) => {
    console.log(`The Worker number: ${worker.id} has died`);
  });
} else {
  createApplication();
}
