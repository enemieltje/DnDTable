import http from "node:http";
import { server } from "websocket";
import { LogManager, FileUtils, LoggerUtils } from "@utils";
import { join as joinpath } from "node:path";
import { WsServer } from "./servers/WsServer";

const logger = LogManager.getLogger({
	name: "index",
});

const logConfig = {
	LogLevel: "INFO",
	LogDirectory: "./logs",
	Format: "{reset}{levelcolor}[{namecolor}{name}{levelcolor}]{prefill}{groupspace}{message}{reset}",
};

LogManager.funcNameDebug = false;
LogManager.setFormat(logConfig.Format);
LogManager.setLogLevel(LoggerUtils.LogLevelfromString(logConfig.LogLevel));
LogManager.logToDefaultFile(joinpath(logConfig.LogDirectory, "/default.log"), {
	LogEverything: false,
});

const controlServer = new WsServer({ port: 8081, name: "controlServer" });
controlServer.addFile("index.html", "./client/control/index.html");

const mapServer = new WsServer({ name: "mapServer" });
mapServer.addFile("index.html", "./client/map/index.html");
