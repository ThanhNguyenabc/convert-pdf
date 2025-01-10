"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const cluster_1 = __importDefault(require("cluster"));
const os_1 = require("os");
const cors_1 = __importDefault(require("cors"));
const route_1 = __importDefault(require("./route"));
const constants_1 = require("./constants");
require("dotenv").config();
const os = (0, os_1.cpus)().length;
const createApplication = () => {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.use(express_1.default.static("public"));
    app.use(body_parser_1.default.json({ limit: "100mb" }));
    app.use(body_parser_1.default.urlencoded({ limit: "100mb", extended: true }));
    app.use("/", route_1.default);
    app.listen(constants_1.PORT, () => __awaiter(void 0, void 0, void 0, function* () {
        console.log(`Server started on host : ${constants_1.PORT}`);
    }));
};
if (cluster_1.default.isPrimary && process.env.NODE_ENV === "production") {
    for (let i = 0; i < os; i++) {
        cluster_1.default.fork();
    }
    cluster_1.default.on("exit", (worker) => {
        console.log(`The Worker number: ${worker.id} has died`);
    });
}
else {
    createApplication();
}
