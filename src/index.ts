import { LogManager, LoggerUtils, LogLevel, FileUtils } from "@utils";
import * as ws from "websocket";
import { join, basename } from "node:path";
import { TypedMessage, WsServer } from "./servers/WsServer";

const logConfig = {
	LogLevel: "INFO",
	LogDirectory: "./logs",
	Format: "{reset}{levelcolor}[{namecolor}{name}{levelcolor}]{prefill}{groupspace}{message}{reset}",
};

LogManager.funcNameDebug = false;
LogManager.setFormat(logConfig.Format);
LogManager.setLogLevel(LoggerUtils.LogLevelfromString(logConfig.LogLevel));
LogManager.logToDefaultFile(join(logConfig.LogDirectory, "/default.log"), {
	LogEverything: false,
});

const logger = LogManager.getLogger({
	name: "index",
	level: LogLevel.DEBUG,
});

const controlServer = new WsServer({ port: 8081, name: "controlServer" });
controlServer.addFile("index.html", "./client/control/index.html");

const mapServer = new WsServer({ name: "mapServer" });
mapServer.addFile("index.html", "./client/map/index.html");

mapServer.on("wsConnect", connection => {
	connection.send("Hello from Server!");
});

mapServer.on("wsTypedMessage", (message: TypedMessage, connection: ws.connection) => {
	switch (message.type) {
		case "requestMap": {
			const mapName = message.data as string;
			connection.send(
				JSON.stringify({ type: "addMap", data: { name: mapName, map: getMap(mapName) } })
			);
			connection.send(WsServer.typedMessageToString("showMap", mapName));
		}
	}
});

controlServer.on("wsConnect", connection => {
	mapServer.sendToSockets(`A new Controller appeared: ${connection.remoteAddress}`);
	// mapServer.sendToSockets(JSON.stringify({ type: "replaceText", data: "Controlled Maps!" }));
});

controlServer.on("wsTypedMessage", (message: TypedMessage, connection: ws.connection) => {
	switch (message.type) {
		case "showMap": {
			mapServer.sendToSockets(JSON.stringify(message));
			break;
		}
		case "getMapList": {
			logger.debug("getmaplist");
			connection.send(WsServer.typedMessageToString("mapList", getMapList()));
			break;
		}
	}
});

function getMapList() {
	const files = FileUtils.getFileArray({ directory: "data/maps", extension: "png" });
	const mapList: string[] = [];

	files.forEach(filePath => {
		const fileName = basename(filePath, ".png");
		mapList.push(fileName);
	});

	return mapList;
}

function getMap(mapName: string) {
	return `data/maps/${mapName}.png`;
}
