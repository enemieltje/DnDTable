import { LogManager, LoggerUtils, LogLevel } from "@utils";
import * as ws from "websocket";
import { join } from "node:path";
import { TypedMessage, WsServer } from "./servers/WsServer";

const logger = LogManager.getLogger({
	name: "index",
	level: LogLevel.DEBUG,
});

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
			const mapName = message.data;
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

controlServer.on("wsTypedMessage", (message: TypedMessage) => {
	switch (message.type) {
		case "showMap": {
			mapServer.sendToSockets(JSON.stringify(message));
		}
	}
});

function getMap(mapName: string) {
	return `data/maps/${mapName}.png`;
}
