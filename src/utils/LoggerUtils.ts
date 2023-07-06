import * as fs from "node:fs";
import * as Path from "node:path";
import * as util from "node:util";

import { FileUtils, StringUtils } from "@utils";

/**
 * enum for all ansi default log colors, used in console
 */
export enum LogColor {
	Reset = "\x1b[0m",
	Bright = "\x1b[1m",
	Dim = "\x1b[2m",
	Underscore = "\x1b[4m",
	Blink = "\x1b[5m",
	Reverse = "\x1b[7m",
	Hidden = "\x1b[8m",

	Previous = "\x1b[39m",
	Black = "\x1b[30m",
	Red = "\x1b[31m",
	Green = "\x1b[32m",
	Yellow = "\x1b[33m",
	Blue = "\x1b[34m",
	Magenta = "\x1b[35m",
	Cyan = "\x1b[36m",
	White = "\x1b[37m",
	Gray = "\x1b[90m",

	BgBlack = "\x1b[40m",
	BgRed = "\x1b[41m",
	BgGreen = "\x1b[42m",
	BgYellow = "\x1b[43m",
	BgBlue = "\x1b[44m",
	BgMagenta = "\x1b[45m",
	BgCyan = "\x1b[46m",
	BgWhite = "\x1b[47m",
	BgGray = "\x1b[100m",
}

/**
 * The lower the level number, the more information there will be logged
 */
export enum LogLevel {
	OFF = 1000,
	ERROR = 900,
	WARNING = 800,
	INFO = 600,
	DEBUG = 400,
	ALL = -1,
}

export function LogLevelfromString(s: string): LogLevel {
	const upper = s.toUpperCase();

	switch (upper) {
		case "DEBUG":
			return LogLevel.DEBUG;
		case "ERROR":
			return LogLevel.ERROR;
		case "ALL":
			return LogLevel.ALL;
		case "WARN":
		case "WARNING":
			return LogLevel.WARNING;
		default:
			return LogLevel.INFO;
	}
}

/**
 * logger to log to console
 */
export class Logger {
	protected whitespace = "";
	protected enabled: boolean;

	readonly name: string;

	loglevel?: LogLevel;
	namecolor: LogColor;
	runLogsAsync = true;
	debugfuncNameColor: LogColor;

	constructor({
		name,
		level,
		namecolor = LogColor.Gray,
		debugfuncNameColor = LogManager.debugfuncNameColor,
	}: LoggerOptions) {
		if (StringUtils.isEmptyString(name))
			throw new Error("logger name cannot be empty", { cause: "incompetence" });

		this.name = StringUtils.truncate(name, LogManager.MAXNAMELENGTH).toLowerCase();
		this.enabled = LogManager.isFocused(this);

		this.loglevel = level;
		this.namecolor = namecolor;
		this.debugfuncNameColor = debugfuncNameColor;

		return LogManager.addLogger(this);
	}

	/**
	 * if you don't want this logger to log to console
	 *
	 * @param enabled if no boolean is given, it will toggle
	 */
	setEnabled(enabled?: boolean) {
		this.enabled = enabled !== undefined ? enabled : !this.enabled;
		return this;
	}

	/**
	 * Check if a message of the given level would actually be logged by this logger.
	 *
	 * This check is based on the Loggers effective level,
	 * which may be inherited from its parent.
	 *
	 * @param   level:   the message logging level
	 * @return  boolean: true if the given message level is currently being logged.
	 */
	isLoggable(level: LogLevel) {
		return !(level < (this.loglevel || LogManager.logLevel) || level === LogLevel.OFF);
	}

	/**
	 * Gets the configured color from logger name color or LogManager colors
	 *
	 * @param level: the level (or name) associated with the returned color
	 * @returns the given color, will default to grey
	 */
	getColor(level: LogLevel | "name"): LogColor {
		if (level === "name") return this.namecolor;

		return LogManager.getColor(level) || LogColor.Gray;
	}

	error(message: string, ...rest: unknown[]) {
		return this.message(LogLevel.ERROR, message, rest);
	}

	warn(message: string, ...rest: unknown[]) {
		return this.message(LogLevel.WARNING, message, rest);
	}

	info(message: string, ...rest: unknown[]) {
		return this.message(LogLevel.INFO, message, rest);
	}

	/**
	 * NOTE: if this.funcNameDebug it is enabled is very performance heavy,
	 * don't enable this.funcNameDebug in production!
	 */
	debug(message: string, ...rest: unknown[]) {
		const callFuncName = LogManager.funcNameDebug
			? this.debugfuncNameColor +
			  StringUtils.getFunctionName(2) +
			  ": " +
			  this.getColor(LogLevel.DEBUG)
			: "";

		return this.message(LogLevel.DEBUG, callFuncName + message, rest);
	}

	/**
	 * logs a stacktrace to console from the function that calls this
	 *
	 * NOTE: stacktrace is very performance heavy! don't enable in production!
	 */
	trace(message = "Trace:", ...rest: unknown[]) {
		return this.message(
			LogLevel.DEBUG,
			message + "\n" + StringUtils.captureStackTrace(2, true),
			rest
		);
	}

	group() {
		this.whitespace += "|\t";
		return this;
	}

	groupEnd() {
		this.whitespace = this.whitespace.slice(0, -2);
		return this;
	}

	groupClear() {
		this.whitespace = "";
		return this;
	}

	focus() {
		LogManager.focus(this);
		return this;
	}

	unfocus() {
		LogManager.unfocus();
		return this;
	}

	protected message(level: LogLevel, message: string, rest: unknown[]) {
		this.runAsync(() => {
			if (this.enabled && this.isLoggable(level))
				this.logToConsole(level, this.name, this.namecolor, this.whitespace, message, rest);

			LogManager.logMessageToDefaultFile(level, this.name, this.whitespace, message, rest);
		});
		return this;
	}

	protected logToConsole(
		level: LogLevel,
		name: string,
		namecolor: LogColor,
		whitespace: string,
		message: string,
		rest: unknown[]
	) {
		// eslint-disable-next-line no-console
		console.log(
			LogManager.formatMessage(
				{
					level,
					name,
					namecolor,
					whitespace,
					message,
				},
				rest
			)
		);
	}

	/**
	 * this is a function to make the logger run async or if dissabled not run async
	 */
	//TODO: move to object utils?
	protected runAsync(callback: () => void) {
		// this is done so the last logs will still show on shutdown
		if (process.exitCode === 0 || !this.runLogsAsync) callback();

		// by default we will log it async
		setImmediate(callback);
	}

	close() {
		this.enabled = false;
	}
}

/**
 * logger to log to file (and as default also logs to console)
 */
export class FileLogger extends Logger {
	private writestream: fs.WriteStream;
	logOutputToConsole: boolean;
	logEverythingToFile: boolean;

	constructor(options: FileLoggerOptions) {
		super(options);
		const { logEverythingToFile = false, logToConsoleOutput = true } = options;
		this.logEverythingToFile = logEverythingToFile;
		this.logOutputToConsole = logToConsoleOutput;
		this.writestream = this.openFile(options.filepath, options.rotatefile);
	}

	// Default log files is in "logs" folder with name from logger
	protected openFile(filepath: string = "./logs/" + this.name + ".log", rotateFile = true) {
		filepath = Path.normalize(filepath);

		fs.mkdirSync(Path.dirname(filepath), { recursive: true });

		if (this.writestream) this.writestream.close();
		if (rotateFile) FileUtils.rotateFile(filepath);

		return fs.createWriteStream(filepath, {
			encoding: "utf8",
			flags: "w",
		});
	}

	/**
	 * @Override
	 */
	protected message(level: LogLevel, message: string, rest: unknown[]) {
		this.runAsync(() => {
			if (this.enabled && this.isLoggable(level)) {
				if (this.logOutputToConsole)
					// we don't do super.message because we already did al the checks
					this.logToConsole(
						level,
						this.name,
						this.namecolor,
						this.whitespace,
						message,
						rest
					);

				// we don't want to log twice to the file
				if (!this.logEverythingToFile)
					this.logToFile(level, this.name, this.whitespace, message, rest);
			}

			LogManager.logMessageToDefaultFile(level, this.name, this.whitespace, message, rest);

			if (this.logEverythingToFile)
				this.logToFile(level, message, this.name, this.whitespace, rest);
		});

		return this;
	}

	protected logToFile(
		level: LogLevel,
		name: string,
		whitespace: string,
		message: string,
		rest: unknown[]
	) {
		const line =
			LogLevel[level] +
			"\t" +
			LogManager.formatMessage(
				{
					level,
					namecolor: this.namecolor,
					name,
					whitespace,
					message,
					tabwidth: 4,
				},
				rest
				// this replaceall is so we can add the two tabs for the level
			).replaceAll("\n", "\n\t\t");

		this.writestream.write(util.stripVTControlCharacters(line) + "\n");
	}

	/**
	 * @Override
	 */
	close() {
		super.close();
		this.writestream.close();
	}
}

/**
 * this is a static class (only one instance can/is created) to manage the loggers
 *
 * loggers use the colors, format and focus state from this manager
 */
export const LogManager = new (class LogManager {
	private loggers: Map<string, Logger> = new Map();
	private format =
		"{reset}{levelcolor}[{namecolor}{name}{levelcolor}]{prefill}{groupspace}{message}{reset}";
	private currentFocusLogger?: string;
	private logFile?: defaultFileLogger;
	logLevel: LogLevel = LogLevel.INFO;

	logColors: logColorsMap = {
		[LogLevel.OFF]: LogColor.Reset,
		[LogLevel.ERROR]: LogColor.Red,
		[LogLevel.WARNING]: LogColor.Yellow,
		[LogLevel.INFO]: LogColor.Gray,
		[LogLevel.DEBUG]: LogColor.Blue,
		[LogLevel.ALL]: LogColor.Blue,
	};

	funcNameDebug = process.env.NODE_ENV !== "production";
	debugfuncNameColor = LogColor.Green;

	MAXNAMELENGTH = 20;
	maxMessageLength = 60;
	private currentMaxNameLength = 0;

	logToDefaultFile(
		filepath = "./logs/default.log",
		{ rotatefile = false, LogEverything = true } = {}
	) {
		if (this.logFile) this.logFile.close();

		this.logFile = new defaultFileLogger({
			rotatefile: rotatefile,
			logEverythingToFile: LogEverything,
			name: "1337",
			logToConsoleOutput: false,
			filepath,
		});
	}

	logMessageToDefaultFile(
		level: LogLevel,
		name: string,
		whitespace: string,
		message: string,
		rest: unknown[]
	) {
		if (!this.logFile) return false;

		this.logFile.logmessage(level, name, whitespace, message, rest);
		return true;
	}

	private getLoggerOrOptions(options: LoggerOptions | string) {
		const argIsString = typeof options === "string";
		const option = argIsString ? { name: options } : options;

		option.name = option.name.toLowerCase();

		if (this.loggers.has(option.name)) {
			return this.loggers.get(option.name) as Logger;
		}

		return option;
	}

	/**
	 * gets a logger with given name | options
	 *
	 * or existing FileLogger or Logger if already exists with given name
	 */
	getLogger(options: LoggerOptions | string): Logger {
		// get the logger if already exists
		const potential = this.getLoggerOrOptions(options);
		if (potential instanceof Logger) return potential;

		// create new logger because does not exist yet
		return new Logger(potential);
	}

	/**
	 * gets a FileLogger with given name | options,
	 *
	 * or existing FileLogger or Logger if already exists with given name
	 */
	getFileLogger(options: FileLoggerOptions | string): FileLogger | Logger {
		// get the logger if already exists
		const potential = this.getLoggerOrOptions(options);
		if (potential instanceof Logger) return potential;

		// create new logger because does not exist yet
		return new FileLogger(potential);
	}

	/**
	 * add a given logger, returns existing logger if name already exists
	 */
	addLogger(logger: Logger) {
		// get the logger if already exists, because we cant have a new logger
		const potential = this.getLoggerOrOptions({ name: logger.name });
		if (potential instanceof Logger) return potential;

		// add logger because does not exist with given name
		this.loggers.set(potential.name, logger);
		this.updateCurrentMaxNameLength();
		return logger;
	}

	/**
	 * if the given logger is enabled and focused, if none are focused it defaults to true
	 */
	isFocused(options: string | Logger): boolean {
		if (!(typeof options === "string")) {
			options = options.name;
		}

		let focused = true;

		if (!StringUtils.isEmptyString(this.currentFocusLogger)) {
			if (!StringUtils.equalsIgnoreCase(options, this.currentFocusLogger)) focused = false;
		}

		return focused;
	}

	private updateCurrentMaxNameLength() {
		const names = this.getLoggerNames();
		this.currentMaxNameLength = StringUtils.maxStringLength(...names);
	}

	/**
	 * set the formatter string for all the Loggers.
	 *
	 * must contain at least "{reset}" and "{message}"
	 *
	 * default=
	 * "{reset}{levelcolor}[{namecolor}{name}{levelcolor}]{prefill}{groupspace}{message}{reset}"
	 *
	 * @returns true if format is valid and set
	 */
	setFormat(format: string) {
		if (!StringUtils.includesAll(format, "{reset}", "{message}")) return false;

		this.format = format;
		return true;
	}

	/**
	 * sets the loglevel of logger (given | all) to the (given | Logmanager.level) loglevel
	 *
	 * @param level if not given, will set to undefined, so that the LogManager level is used
	 * @param loggers if not given, will set level for every logger registered
	 */
	setLogLevel(level?: LogLevel, loggers?: Logger[]) {
		const search: Logger[] = loggers || Array.from(this.loggers.values());

		if (this.logLevel == level) {
			level = undefined;
		}

		for (const logger of search) {
			logger.loglevel = level;
		}
	}

	/**
	 * sets the loglevel of every logger to the Logmanager loglevel
	 */
	resetLogLevel() {
		this.setLogLevel();
	}

	/**
	 * get name of every logger that is registered to this LogManager
	 * @returns
	 */
	getLoggerNames() {
		return Array.from(this.loggers.keys());
	}

	/**
	 * get the logColor in ansi string form for given level
	 */
	getColor(level: LogLevel): LogColor {
		return this.logColors[level];
	}

	/**
	 * sets the color for the given level
	 * (this is for every logger for consistency)
	 */
	setColor(level: LogLevel, color: LogColor) {
		this.logColors[level] = color;
	}

	/**
	 * formats a log message, based on set this.format
	 *
	 * @returns string of formatted message
	 */
	formatMessage(options: formatMessageOptions, rest: unknown[]) {
		const levelcolor = this.logColors[options.level];

		for (const arg of rest) {
			// format the args with the inspect function:
			// https://nodejs.org/api/util.html#utilinspectobject-showhidden-depth-colors
			const formattedArg =
				typeof arg === "string"
					? levelcolor + arg
					: LogColor.Reset + util.inspect(arg, { colors: true });

			const lastLineLength = StringUtils.CountCharAfterLast(
				options.message + formattedArg,
				"\n"
			);

			options.message +=
				(lastLineLength > this.maxMessageLength &&
				!formattedArg.startsWith("\n") &&
				!options.message.endsWith("\n")
					? "\n"
					: options.message.endsWith("\n")
					? ""
					: " ") +
				formattedArg +
				levelcolor;
		}

		//TODO: HELP: does not work as intended at name length 13? @enemieltje or @redstonegek?
		// padLength is for newlines only
		let padlength = Math.floor((this.currentMaxNameLength + 2) / (options.tabwidth || 8));
		if (this.currentMaxNameLength === 13) padlength += 1;
		const padding = "\n\t" + "\t".repeat(padlength) + options.whitespace;

		// set the beginning of the log message to the max name length
		let prefillLength = Math.max(
			0,
			Math.floor(
				(this.currentMaxNameLength - options.name.length + 2) / (options.tabwidth || 8)
			)
		);
		if (options.name.length === 13) prefillLength += 1;
		const prefill = "\t" + "\t".repeat(prefillLength);

		const reset = LogColor.Reset;

		const namecolor = options.namecolor;
		const groupspace = options.whitespace;
		const name = options.name;

		const finalMessage = StringUtils.replaceWithName(
			{ string: this.format, addToEnd: false },
			{ reset, levelcolor, name, namecolor, groupspace, prefill, message: options.message }
		).replaceAll("\n", padding);

		return finalMessage;
	}

	/**
	 * only shows logs from one logger, from given name
	 *
	 * @param logger the logger to only show
	 */
	focus(logger: string | Logger) {
		if (!(typeof logger === "string")) {
			logger = logger.name;
		}

		this.unfocus();

		this.currentFocusLogger = logger;

		for (const [name, log] of this.loggers) {
			if (name !== logger) log.setEnabled(false);
		}
	}

	/**
	 * show every logger logs
	 */
	unfocus() {
		if (this.currentFocusLogger) {
			const FocusLogger = String(this.currentFocusLogger);
			this.enableAll();
			return FocusLogger;
		}
	}

	/**
	 * sets all loggers to enabled
	 */
	enableAll() {
		this.currentFocusLogger = undefined;

		for (const [, logger] of this.loggers) {
			logger.setEnabled(true);
		}
	}

	/**
	 * closes every logger registered to this LogManager
	 */
	close() {
		for (const [, logger] of this.loggers) {
			logger.close();
		}
	}
})();

/**
 * private class for Logmanager's common default logger
 */
class defaultFileLogger extends FileLogger {
	logmessage(
		level: LogLevel,
		name: string,
		whitespace: string,
		message: string,
		rest: unknown[]
	): this {
		if (this.logEverythingToFile) {
			this.logToFile(level, name, whitespace, message, rest);
		} else if (this.isLoggable(level)) this.logToFile(level, name, whitespace, message, rest);

		return this;
	}
}

interface formatMessageOptions {
	level: LogLevel;
	name: string;
	namecolor: LogColor;
	whitespace: string;
	message: string;
	/**
	 * if not set, the formatter will use 8 as tabwidth (is the default for console)
	 */
	tabwidth?: number;
}

/**
 * all the colors for specific loglevel
 */
type logColorsMap = {
	[key in LogLevel]: LogColor;
};

interface LoggerOptions {
	name: string;
	/**
	 * if not set the level wil be the LogManager.logLevel
	 * @default LogLevel.INFO
	 */
	level?: LogLevel;
	/**
	 * the color for the name in console
	 * @default Logcolor.Gray
	 */
	namecolor?: LogColor;
	/**
	 * the specific color to log the function name with
	 *
	 * @default LogManager.debugfuncNameColor
	 */
	debugfuncNameColor?: LogColor;
}

interface FileLoggerOptions extends LoggerOptions {
	/**
	 * the filepath to log to
	 * @default `./logs/${this.name}.log`
	 */
	filepath?: string;
	/**
	 * rotates the log files with old file renamed to: "<name>.log.old"
	 * @default true
	 */
	rotatefile?: boolean;
	/**
	 * if everything should be logged to console, regardless of level.
	 * @default false
	 */
	logEverythingToFile?: boolean;
	/**
	 * if should also log to console.
	 * @default true
	 */
	logToConsoleOutput?: boolean;
}
