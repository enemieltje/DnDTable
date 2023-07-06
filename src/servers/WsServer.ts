import http from "node:http";
import fs from "node:fs";
import { join, resolve } from "node:path";
import * as ws from "websocket";
import { LogManager, FileUtils, LoggerUtils, LogLevel, StringUtils } from "@utils";
import EventEmitter from "node:events";

export enum ServerStatus {
	OFFLINE,
	STARTING,
	HTTP_ONLINE,
	WS_ONLINE,
}

export class WsServer extends EventEmitter {
	protected files = new Map<string, string>();
	protected hostname: string;
	protected port: number;
	protected httpServer?: http.Server;
	protected wsServer?: ws.server;
	protected status = ServerStatus.OFFLINE;
	protected sockets = new Map<string, ws.connection>();
	public logger: LoggerUtils.Logger;

	constructor({ hostname, port, name }: { hostname?: string; port?: number; name?: string }) {
		super();
		this.logger = LogManager.getLogger({
			name: name ?? "WsServer",
			level: LogLevel.DEBUG,
		});
		this.hostname = hostname ?? "0.0.0.0";
		this.port = port ?? 8080;
		this.startHttp();
	}

	private startHttp() {
		if (this.status != ServerStatus.OFFLINE) return;
		this.status = ServerStatus.STARTING;
		this.httpServer = http.createServer((req, res) => {
			this.logger.debug("Request made: ", req.url);
			if (req.url && StringUtils.includesOne(req.url, "/data/maps/")) {
				this.logger.debug(`map request: `, req.url);
				this.handleMapReq(req, res);
				return;
			}
			const indexPath = this.files.get("index.html") ?? "index";
			const indexFile = FileUtils.loadString(indexPath, {
				defaultString: indexPath,
			});
			res.statusCode = 200;
			res.setHeader("Content-Type", "text/html");
			res.end(indexFile);
		});

		this.httpServer.listen(this.port, this.hostname, () => {
			this.logger.info(`Server running at http://${this.hostname}:${this.port}/`);
		});

		this.status = ServerStatus.HTTP_ONLINE;
		this.startWs();
	}

	private startWs() {
		if (this.status != ServerStatus.HTTP_ONLINE) return;
		if (!this.httpServer) return;

		this.wsServer = new ws.server({
			httpServer: this.httpServer,
			autoAcceptConnections: false,
		});
		this.status = ServerStatus.WS_ONLINE;
		this.acceptSockets();
	}

	private acceptSockets() {
		if (this.status != ServerStatus.WS_ONLINE) return;
		if (!this.wsServer) return;

		this.wsServer.on("request", req => {
			this.logger.debug("ws request: ", req.remoteAddress);
			const connection = req.accept("echo-protocol", req.origin);
			this.logger.debug("Connection accepted: ", connection.remoteAddress);
			this.emit("wsConnect", connection);
			this.sockets.set(connection.remoteAddress, connection);

			connection.on("message", message => {
				if (message.type === "utf8") {
					this.handleMessage(message.utf8Data, connection);
				} else if (message.type === "binary") {
					this.logger.debug(
						"Received Binary Message of " + message.binaryData.length + " bytes"
					);
				}
			});

			connection.on("close", (_reasonCode, _description) => {
				this.emit("wsClose", connection);
				this.logger.debug("Peer " + connection.remoteAddress + " disconnected.");
				this.sockets.delete(connection.remoteAddress);
			});
		});
	}

	private handleMessage(message: string, connection: ws.connection) {
		this.emit("wsMessage", message);
		const typedMessage = WsServer.getTypedMessage(message);
		if (!typedMessage) {
			this.logger.debug("Received Message without type: " + message);
			this.emit("wsStringMessage", message);
			return;
		}
		this.emit("wsTypedMessage", typedMessage, connection);
		this.logger.debug(`message with type: ${typedMessage.type}`);
	}

	private handleMapReq(
		req: http.IncomingMessage,
		res: http.ServerResponse<http.IncomingMessage>
	) {
		if (!req.url) return;

		const regexArray = /\/data\/maps\/([^.]*)\.png/.exec(req.url);
		if (!regexArray) return;
		let mapName = `${regexArray[1] ?? ""}.png`;
		// this.logger.debug("regex array: ", regexArray);
		mapName = mapName.replace("%20", " ");
		this.logger.debug("reading map: ", mapName);

		const imagePath = join(__dirname, "../../data/maps/", mapName);
		this.logger.debug("path: ", imagePath);
		if (!imagePath) return;

		fs.readFile(imagePath, (e, content) => {
			if (e) {
				res.writeHead(400, { "Content-type": "text/html" });
				this.logger.warn(e.message);
				res.end("No such image");
			} else {
				//specify the content type in the response will be an image
				this.logger.debug("read map!");
				res.writeHead(200, { "Content-type": "image/png" });
				res.end(content);
			}
		});
	}

	public sendToSockets(data: Buffer | string) {
		this.sockets.forEach(connection => {
			connection.send(data);
		});
	}

	public addFile(name: string, path: string) {
		// const file = FileUtils.loadString(path, {
		// 	defaultString: path,
		// });
		this.logger.debug(`Registered file: ${name}: ${path}`);
		this.files.set(name, path);
	}

	static typedMessageToString(type: string, data: unknown) {
		return JSON.stringify({ type, data });
	}

	static getTypedMessage(message: string) {
		try {
			const messageContent = JSON.parse(message);
			if (!messageContent.type) return;
			if (!messageContent.data) return;
			return messageContent as TypedMessage;
		} catch (error) {
			return;
		}
	}
}

export type TypedMessage = {
	type: string;
	data: unknown;
};
