import http from "node:http";
import * as ws from "websocket";
import { LogManager, FileUtils, LoggerUtils, LogLevel } from "@utils";
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
		this.httpServer = http.createServer((_req, res) => {
			const index = this.files.get("index.html") ?? "index";
			res.statusCode = 200;
			res.setHeader("Content-Type", "text/html");
			res.end(index);
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
			const connection = req.accept("echo-protocol", req.origin);
			this.logger.debug("Connection accepted: ", connection.remoteAddress);
			this.emit("wsConnect", connection);
			this.sockets.set(connection.remoteAddress, connection);

			connection.on("message", message => {
				this.emit("wsMessage", connection);
				if (message.type === "utf8") {
					this.logger.debug("Received Message: " + message.utf8Data);
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

	public sendToSockets(data: Buffer | string) {
		this.sockets.forEach(connection => {
			connection.send(data);
		});
	}

	public addFile(name: string, path: string) {
		const file = FileUtils.loadString(path, {
			defaultString: path,
		});
		this.logger.debug(`Registered file: ${name}: ${path}`);
		this.files.set(name, file);
	}
}
