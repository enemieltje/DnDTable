import { ObjectUtils, FileUtils, StringUtils, LogManager, LogLevel } from "@utils";
import * as PATH from "node:path";

const logger = LogManager.getLogger({
	name: "LangUtils",
	level: LogLevel.INFO,
});

/**
 * LanguageFile class to manage a language file and load/edit the data from it
 */
export class LanguageFile {
	readonly language: string;
	readonly filepath: string;
	private data: unknown = {};

	constructor(language: string, filepath: string) {
		this.language = language;
		this.filepath = filepath;

		LangManager.addLanguageFile(this);
		this.data = this.loadData();
	}

	/**
	 * loads the json file given from filepath
	 */
	protected loadData() {
		return FileUtils.loadJSON(this.filepath, { fallbackObject: {}, createFile: false });
	}

	/**
	 * saves the current data to languagefile
	 */
	protected saveData() {
		if (this.data && Object.keys(this.data).length != 0)
			return FileUtils.saveJSON(this.filepath, this.data);
	}

	/**
	 * gets the message from the language file, replacing the names given
	 */
	getMessage(key: string, options: Record<string, string | undefined> = {}): string {
		if (this.messageExists(key)) {
			const message = ObjectUtils.getFromStringKey(this.data, key);

			if (typeof message === "string") {
				logger.debug(
					"for language: ",
					this.language,
					"using key:",
					key,
					"with message:",
					message
				);
				return StringUtils.replaceWithName(
					{ string: message, addToEnd: LangManager.addExtraArgsToEnd },
					options
				);
			}
		}

		return LangManager.getfallbackMessage(key, options);
	}

	/**
	 * sets the given object to this programatically, to ensure that it is in the languageFile
	 *
	 * will save the data to make sure it is in the data directory
	 */
	setSectionMessages(
		messages: Record<string, string | Record<string, string | Record<string, string>>>
	) {
		logger.debug("setting keys for language: ", this.language);
		this.data = ObjectUtils.typeCheckAndMerge(this.data, messages);
		this.saveData();
	}

	/**
	 * checks if the message key exists
	 * @param key the key to get the message:
	 * @example
	 * const exists = LanguageFile.messageExists("test.key");
	 * if (exists) {
	 * 	return console.debug(LanguageFile.getMessage("test.key", {cool: "yes"});
	 *
	 * console.debug(LanguageFile.getMessage("fallback", {cool: "maybe"}));
	 */
	messageExists(key: string): boolean {
		return typeof ObjectUtils.getFromStringKey(this.data, key) === "string";
	}
}

/**
 * this handles all the language files and loads them in, with a default language for easy
 *
 * @see LanguageFile.getMessage
 */
export const LangManager = new (class LangManager {
	private LanguageFiles = new Map<string, LanguageFile>();
	private DefaultLanguage = "en-GB";

	langFolder = "./lang/";
	addExtraArgsToEnd = true;

	/**
	 * tries to load the LangUtil with the given options
	 *
	 * @param language to load the LanguageFile With, example: "nl-NL"
	 */
	setDefaultLanguage(language: string) {
		this.DefaultLanguage = StringUtils.makeValidLocale(language);
		this.getLanguageFile(this.DefaultLanguage);
		logger.debug("setting to: " + this.DefaultLanguage);
	}

	/**
	 * get the LanguageFile for the language with specific options
	 *
	 * @param Language language string
	 *
	 * @returns the language file
	 */
	getLanguageFile(language: string): LanguageFile {
		language = StringUtils.makeValidLocale(language);

		logger.debug("getting language: " + language);

		if (this.LanguageFiles.has(language))
			return this.LanguageFiles.get(language) as LanguageFile;

		const path = this.checkForLanguageFile(language);
		logger.debug("loading new language: " + language + "\n\twith path:", path);

		const langFile = new LanguageFile(language, path);

		this.LanguageFiles.set(language, langFile);
		return langFile;
	}

	/**
	 * checks for file from given language
	 */
	private checkForLanguageFile(language: string): string {
		language = StringUtils.makeValidLocale(language);

		const langfile = FileUtils.recursiveSearch(language + ".json", this.langFolder);
		if (langfile) return langfile;

		const resultArray = FileUtils.getFileArray({
			extension: ".json",
			directory: this.langFolder,
		});

		for (const name of resultArray) {
			const basename = PATH.basename(name);

			// search: for first part
			const firstpart = language.substring(0, 2).toLowerCase();
			if (basename === firstpart + ".json") return name;

			// search: for last part
			const lastpart = language.substring(3, 5).toLowerCase();
			if (basename === lastpart + ".json") return name;

			// search: if the name is something like: "en-CA.json" with en being valid
			if (basename.startsWith(firstpart)) return name;

			// search: if the name is something like: "gb.json"
			if (basename.startsWith(lastpart)) return name;
		}

		// create file, example: "NL-BE" finds file: "nl-BE.json"
		return FileUtils.findOrCreateFile(language + ".json", {
			searchdir: this.langFolder,
			content: "{}",
		});
	}

	/**
	 * adds an already created file, or returns if already has the language
	 *
	 * only one languageFile per language can be set
	 */
	addLanguageFile(languageFile: LanguageFile): LanguageFile {
		if (this.LanguageFiles.has(languageFile.language))
			return this.LanguageFiles.get(languageFile.language) as LanguageFile;

		logger.debug("adding language: " + languageFile.language);

		this.LanguageFiles.set(languageFile.language, languageFile);
		return languageFile;
	}

	/**
	 * gets the setup language file for the LangUtil
	 */
	getDefaultLanguageFile() {
		return this.getLanguageFile(this.DefaultLanguage);
	}

	/**
	 * gets a fallback message for given key
	 *
	 * first checks default LanguageFile
	 * otherwise uses the key for fallback
	 */
	getfallbackMessage(key: string, options: Record<string, string | undefined> = {}): string {
		if (this.getDefaultLanguageFile()?.messageExists(key)) {
			const potential = this.getDefaultLanguageFile()?.getMessage(key, options);
			if (potential) return potential;
		}

		logger.debug("getting for key:", key);

		return StringUtils.replaceWithName(
			{ string: key, addToEnd: this.addExtraArgsToEnd },
			options
		);
	}

	/**
	 * @see {@link LanguageFile.getMessage}
	 * uses the default Language to get the message from it
	 *
	 * @param key the message name
	 * @returns the message with the given args implemented
	 */
	getMessage(key: string, options: Record<string, string | undefined> = {}): string {
		logger.debug("getting default language message for key:", key);

		return this.getfallbackMessage(key, options);
	}
})();
