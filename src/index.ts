import http from "node:http";
import { LogManager, ConfigManager, FileUtils, LoggerUtils } from "@utils";
import { join as joinpath } from "node:path";

const logger = LogManager.getLogger({
	name: "index",
});

const hostname = '0.0.0.0';
const mapPort = 8080;
const controlPort = 8081;
const mapIndex = FileUtils.loadString("./client/map/index.html", {defaultString: "map"});
const controlIndex = FileUtils.loadString("./client/control/index.html", {defaultString: "map"});



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

const mapServer = http.createServer((_req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end(mapIndex);
});

const controlServer = http.createServer((_req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end(controlIndex);
});

mapServer.listen(mapPort, hostname, () => {
  logger.info(`Map Server running at http://${hostname}:${mapPort}/`);
});

controlServer.listen(controlPort, hostname, () => {
  logger.info(`Control Server running at http://${hostname}:${controlPort}/`);
});
