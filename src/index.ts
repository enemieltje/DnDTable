import http from "node:http";
import {LogManager, FileUtils, LoggerUtils} from "@utils";
import { join as joinpath } from "node:path";

const hostname = '0.0.0.0';
const mapPort = 8080;
const controlPort = 8081;
const mapIndex = FileUtils;


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

const logger = LogManager.getLogger({
  name: 'index',
})

const mapServer = http.createServer((_req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Map\n');
});

const controlServer = http.createServer((_req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Controls\n');
});

mapServer.listen(mapPort, hostname, () => {
  logger.info(`Map Server running at http://${hostname}:${mapPort}/`);
});

controlServer.listen(controlPort, hostname, () => {
  logger.info(`Control Server running at http://${hostname}:${controlPort}/`);
});
