import { jsoncUtils, ObjectUtils, FileUtils, LogManager, LogLevel } from "@utils";

const logger = LogManager.getLogger({
	name: "ConfigUtils",
	level: LogLevel.INFO,
});

/**
 * options to load the config
 */
interface configOptions {
	/**
	 * the path to the config with correct extension! example: "./config.json"
	 */
	filePath: string;
	/**
	 * if the config file in given path should be created if it does not exist
	 * @default true
	 */
	createFile?: boolean;
}

/**
 * config to load the json file with given path
 */
export class Config {
	protected configData: unknown;

	readonly createFile: boolean;
	readonly filepath: string;

	constructor({ filePath, createFile = true }: configOptions) {
		// convert to absolute filepath
		const absoluteFilePath = FileUtils.makeAbsolutePath(filePath);

		this.filepath = absoluteFilePath;
		this.createFile = createFile;

		// we want to open a for only one time, this returns already loaded for given file
		if (ConfigManager.hasConfig(absoluteFilePath))
			return ConfigManager.getConfig(absoluteFilePath);

		ConfigManager.addConfig(this);
		this.load();
	}

	/**
	 * sets this configdata to file data and saves it to be sure the types are correct
	 *
	 * if typechecker fails on something,
	 * it will replace it with default (in file and returned object)
	 *
	 * @param merge gets the most recent version from the file on disk
	 * and merges it with current data
	 *
	 */
	protected load(merge = false) {
		logger.debug("\nfilepath: " + this.filepath + "\ndata: ", this.configData);

		if (merge || !this.configData) {
			this.configData = ObjectUtils.typeCheckAndMerge(this.configData, this.loadData());
			// write merged to file, so we have a validated object to set
			this.save();
		}
	}

	/**
	 * this exists so we can override it in CommentConfig
	 * @returns the data loaded from disk
	 */
	protected loadData() {
		return FileUtils.loadJSON(this.filepath, {
			createFile: this.createFile,
		});
	}

	/**
	 * saves the current config to disk
	 *
	 * @param dataObject gives a object to override the whole file data with
	 */
	save(dataObject?: unknown) {
		if (dataObject)
			this.configData = ObjectUtils.typeCheckAndMerge(dataObject, this.configData);

		this.saveData();

		logger.debug("\nfilepath: " + this.filepath + "\ndata: ", this.configData);
	}

	/**
	 * saves the current data to disk with the config filepath
	 *
	 * this exists so we can override it in CommentConfig
	 */
	protected saveData() {
		FileUtils.saveJSON(this.filepath, this.configData);
	}

	/**
	 * gets the specific section for the config
	 */
	getSection<T>(defaultObject: T): T {
		this.configData = ObjectUtils.typeCheckAndMerge(this.configData, defaultObject);
		return this.configData as T;
	}
}

/**
 * options to load a commentConfig, with commentMap for comments
 */
interface commentConfigOptions extends configOptions {
	/**
	 * @default {} // an empty commentMap (so no comments)
	 */
	commentMap?: jsoncUtils.commentMap;
}

/**
 * this is so we can add comments to our config values
 *
 * done by parsing the comment map with getConfig
 */
export class CommentConfig extends Config {
	private commentMap: jsoncUtils.commentMap = {};

	constructor(options: commentConfigOptions) {
		super(options);
		this.commentMap = ObjectUtils.typeCheckAndMerge(options.commentMap, this.commentMap);
	}

	getCommentedSection<T>(defaultObject: T, comments: jsoncUtils.commentMap): T {
		this.commentMap = ObjectUtils.typeCheckAndMerge(comments, this.commentMap);
		return super.getSection(defaultObject);
	}

	/**
	 * overriding the loading of data so we can get comments from the file
	 * @returns
	 */
	protected loadData() {
		const decode = FileUtils.loadJSONComments(this.filepath, {
			createFile: this.createFile,
		});
		this.commentMap = ObjectUtils.typeCheckAndMerge(decode.commentMap, this.commentMap);
		return decode.resultObject;
	}

	/**
	 * override so we can save all the comments to this file
	 */
	protected saveData(): void {
		FileUtils.saveJSONComments(this.filepath, this.configData, this.commentMap);
	}
}

/**
 * this is a static class (only one instance can/is created) to manage the Configs
 *
 * Configs use the colors, format and focus state from this manager
 */
export const ConfigManager = new (class ConfigManager {
	private configList: Config[] = [];

	/**
	 * get the config from existing config.
	 *
	 * or return the validated options for a new config
	 */
	private getExistingOrOptions(options: configOptions) {
		options.filePath = FileUtils.makeAbsolutePath(options.filePath);
		const existantConfig = this.hasConfig(options.filePath);

		if (existantConfig) {
			logger.debug("getting already existing config: ", existantConfig.filepath);
			return existantConfig;
		}

		logger.debug("registering new config: ", options.filePath);

		return options;
	}

	/**
	 * gets the config with a json file extension
	 */
	getConfig(options: configOptions | string): Config {
		if (typeof options === "string") options = { filePath: options };
		options.filePath = FileUtils.setExtension(options.filePath, "json");

		const configish = this.getExistingOrOptions(options);
		if (configish instanceof Config) return configish;

		return new Config(configish);
	}

	/**
	 * gets a commented config with a jsonc file extension for comments
	 */
	getCommentConfig(options: commentConfigOptions | string): CommentConfig {
		if (typeof options === "string") options = { filePath: options };
		options.filePath = FileUtils.setExtension(options.filePath, "jsonc");
		if (options.commentMap == undefined) options.commentMap = {};

		const configish = this.getExistingOrOptions(options);
		if (configish instanceof Config) return configish as CommentConfig;

		return new CommentConfig(configish as commentConfigOptions);
	}

	/**
	 * adds a given config to the ConfigManager
	 */
	addConfig(config: Config): Config {
		const configish = this.hasConfig(config.filepath);
		if (configish) return configish;

		logger.debug("adding new config to ConfigManager: ", config.filepath);
		this.configList.push(config);
		return config;
	}

	/**
	 * checks if the path is already loaded, and returns the config
	 *
	 * otherwise returns undefined
	 */
	hasConfig(filePath: string): Config | undefined {
		filePath = FileUtils.makeAbsolutePath(filePath);

		logger.debug("checking if has config: ", filePath);

		for (const config of this.configList) {
			if (config.filepath == filePath) return config;
		}

		return undefined;
	}

	/**
	 * save all configs registered to this manager
	 */
	saveAll() {
		for (const config of this.configList) {
			config.save();
		}
	}
})();
