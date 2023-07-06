import * as FS from "node:fs";
import * as PATH from "node:path";

import { StringUtils, jsoncUtils, LogManager, LogLevel } from "@utils";

const logger = LogManager.getLogger({
	name: "FileUtils",
	level: LogLevel.INFO,
});

/**
 * make sure the filepath is absolute, and make it absolute if it is not
 */
export function makeAbsolutePath(filepath: string): string {
	if (!PATH.isAbsolute(filepath)) {
		logger.debug("making filePath Absolute:", filepath);
		filepath = PATH.resolve(filepath);
	}

	return filepath;
}

/**
 * sets the current extension from filePath to given extension
 *
 * replaces extension if already exists, adds if has none
 */
export function setExtension(filepath: string, extension: string): string {
	// make sure the extension starts with a "."
	if (!extension.startsWith(".")) extension = "." + extension;

	logger.debug("setting extension:", extension, "filePath: ", filepath);

	// make sure the filepath has no extensions
	const current = PATH.extname(filepath);
	if (StringUtils.isEmptyString(current)) return filepath + extension;
	if (current === extension) return filepath;

	return StringUtils.replaceLast(filepath, current, extension);
}

interface CreateFileOptions {
	searchdir?: string;
	content?: string;
}

/**
 * Tries to find a file with deepSearch, else creates it in search directory
 *
 * @param filename the file to search for, example: config.json
 * @returns path of found of created file
 */
export function findOrCreateFile(
	fileName: string,
	{ searchdir = "./", content = "" }: CreateFileOptions = {}
) {
	// if no path is given, we want to search every directory
	let searchPath = recursiveSearch(fileName, searchdir);
	if (searchPath) return searchPath;

	searchPath = makeAbsolutePath(PATH.join(searchdir, fileName));

	logger.debug("creating new file: " + searchPath);

	saveString(searchPath, content);
	return searchPath;
}

/**
 * If we want old content to still exist
 * We rename the file and create new empty file
 *
 * @param filepath the complete path to file, from cwd, example: "./logs/test.log"
 * @param newFileExtension default is ".old"
 */
export function rotateFile(filepath: string, newFileExtension = ".old") {
	filepath = makeAbsolutePath(filepath);
	if (!FS.existsSync(filepath)) return;

	const rotateFile = filepath + newFileExtension;

	FS.rmSync(rotateFile, { force: true });
	FS.renameSync(filepath, rotateFile);
	saveString(filepath, "");
}

/**
 * search the file in the searchdirectory and sub directories
 *
 * @param file the filename to search for, example: "config.json"
 * @param searchDir the directory to search, default search path: cwd
 * @returns the found file with requested name, or undefined if not found
 */
export function recursiveSearch(file: string, searchDir = "./"): string | undefined {
	searchDir = makeAbsolutePath(searchDir);
	if (!FS.existsSync(searchDir)) return undefined;

	logger.debug("trying to find file: " + file + " in directory:", searchDir);

	const joinedPath = PATH.normalize(PATH.join(searchDir, file));
	if (FS.existsSync(joinedPath)) return joinedPath;

	const fileArray = FS.readdirSync(searchDir, { withFileTypes: true });

	for (const dirent of fileArray) {
		if (dirent.isDirectory()) {
			// deep search for file in this folder
			const folderpath = PATH.join(searchDir, dirent.name);
			return recursiveSearch(file, folderpath);
		}
	}

	logger.debug("could not find file:\t" + file + "\nin path:\t", searchDir);

	return undefined;
}

interface FileArrayOptions {
	directory?: string;
	extension?: string;
	checkSubDirs?: boolean;
	maxSubDirlevel?: number;
	skipFiles?: string[];
}

/**
 * loads all the files in a given directory, with a specified file extension;
 *
 * @note directory searches from cwd, if no directory is given it will default to cwd
 *
 * @param LoadOptions defaults to:
 * @example {Directory, Extension = "js", CheckSubDirs = true, SkipFiles = []}
 *
 * @returns a array of all the filenames found in given directory
 * @note could return an empty array if no files where found with given parameters
 */
export function getFileArray({
	extension,
	directory = "",
	checkSubDirs = true,
	maxSubDirlevel = 2,
	skipFiles = [],
}: FileArrayOptions = {}): string[] {
	directory = makeAbsolutePath(directory);
	if (!FS.existsSync(directory)) return [];

	// make sure the extension starts with a "."
	if (extension && !extension.startsWith(".")) extension = "." + extension;

	logger.debug(
		"loading files from directory: " + directory,
		"" +
			(extension ? "\nonly getting with extension: " + extension : "") +
			(skipFiles ? "\nand skipping files: " + skipFiles.join("\n\t") : "")
	);

	let loaded: string[] = [];
	const files = FS.readdirSync(directory);

	for (const fileName of files) {
		if (skipFiles.includes(fileName)) continue;

		const filePath = PATH.join(directory, fileName);

		const check = FS.statSync(filePath);

		if (check.isFile()) {
			if (extension && PATH.extname(fileName) != extension) continue;

			loaded.push(filePath);
			continue;
		}

		if (check.isDirectory()) {
			if (checkSubDirs && maxSubDirlevel != 0) {
				const directoryPath = PATH.join(directory, fileName);

				const dirFiles = getFileArray({
					directory: directoryPath,
					extension: extension,
					checkSubDirs: checkSubDirs,
					skipFiles: skipFiles,
					maxSubDirlevel: maxSubDirlevel - 1,
				});
				loaded = loaded.concat(dirFiles);
			}

			continue;
		}
	}

	// If there are no files, than log error and stop this function
	if (loaded.length <= 0) {
		logger.debug("Couldn't find files in directory: " + directory);
		return [];
	}

	logger.debug("loaded files in dir: " + directory + "\n\tfiles: \n\t" + loaded.join("\n\t"));

	return loaded;
}

interface loadJSONOptions<T> {
	fallbackObject?: T;
	createFile?: boolean;
}

/**
 * loads json file from given path
 *
 * @param filepath the path to load json from, defaults to cwd
 * @param loadOptions extra options to load the file with
 *
 * @returns the loaded json, can be the given defaultObject if none was found or error
 */
export function loadJSON<T>(
	filepath: string,
	{ fallbackObject = {} as T, createFile = true }: loadJSONOptions<T> = {}
): T {
	// we must load a json file!
	filepath = setExtension(filepath, "json");
	filepath = makeAbsolutePath(filepath);

	logger.debug("trying to load json file:", filepath);

	try {
		const defaultString = JSON.stringify(fallbackObject);
		const readData = loadString(filepath, { defaultString, createFile });
		if (!StringUtils.isEmptyString(readData)) return JSON.parse(readData);
	} catch (error) {
		logger.debug("could not read file, using defaultObject: ", error);
	}

	return fallbackObject as T;
}

/**
 * saves the given object to disk, creates new file if it does not exist!
 *
 * @param json the object that should be written to the file
 * @param filepath the file that we should write our object to
 *
 * @returns boolean if the json was saved successfully
 */
export function saveJSON(filepath: string, json: unknown, format = true) {
	// we must save a json file!
	filepath = setExtension(filepath, "json");
	filepath = makeAbsolutePath(filepath);

	logger.debug("trying to save json file:", filepath);

	try {
		const dataString = JSON.stringify(json, null, format ? "\t" : undefined);
		return saveString(filepath, dataString);
	} catch (error) {
		logger.debug(`Failed to save data at: ${filepath} \nthere might be data loss!`, error);
		return false;
	}
}

interface JSONCommentsData<T> {
	resultObject: T;
	commentMap: jsoncUtils.commentMap;
}

/**
 * loads jsonc file from given path
 *
 * @param filepath the path to load jsonc from
 * @param loadOptions extra options to load the file with
 *
 * @returns the loaded json, can be the given defaultObject if none was found or error
 */
export function loadJSONComments<T>(
	filepath: string,
	{ fallbackObject = {} as T, createFile = true }: loadJSONOptions<T> = {}
): JSONCommentsData<T> {
	// we must load a jsonc file!
	filepath = setExtension(filepath, "jsonc");
	filepath = makeAbsolutePath(filepath);

	logger.debug("trying to load jsonc file:", filepath);

	try {
		const defaultString = JSON.stringify(fallbackObject, null, "\t");
		const stringData = loadString(filepath, { defaultString, createFile });
		const decode = jsoncUtils.decodeJsonComments(stringData);
		const resultObject = JSON.parse(decode.validJSONString) || fallbackObject;
		return { resultObject, commentMap: decode.commentMap };
	} catch (error) {
		logger.debug("could not read file, using defaultObject: ", error);
	}

	return { resultObject: fallbackObject, commentMap: {} };
}

/**
 * saves the given object to disk, creates new file if it does not exist!
 *
 * @param jsonObject the object that should be written to the file
 * @param filepath the file that we should write our object to
 *
 * @returns boolean if the json was saved successfully
 */
export function saveJSONComments(
	filepath: string,
	jsonObject: unknown,
	commentMap: jsoncUtils.commentMap,
	addNewLine = false
): boolean {
	// we must load a jsonc file!
	filepath = setExtension(filepath, "jsonc");
	filepath = makeAbsolutePath(filepath);

	logger.debug("trying to save jsonc file:", filepath);

	try {
		const dataString = jsoncUtils.addJsonComments(jsonObject, commentMap, addNewLine);
		return saveString(filepath, dataString);
	} catch (error) {
		logger.debug("Failed to save data at: " + filepath + " \nthere might be data loss!", error);
		return false;
	}
}

/**
 * loading string from filepath, with default if failed
 *
 * @returns loaded string from file, using default string if failed
 */
export function loadString(
	filepath: string,
	{ defaultString = "", createFile = true } = {}
): string {
	filepath = makeAbsolutePath(filepath);

	try {
		logger.debug("trying to save to file:", filepath);
		const data = FS.readFileSync(filepath);
		return data.toString("utf8");
	} catch (error) {
		if (createFile) saveString(filepath, defaultString);
		logger.debug(
			"could not read data for path: " + filepath + "\nusing default string!",
			error
		);
		return defaultString;
	}
}

/**
 * save a given string to a given file, creating directory if does not exist
 * @returns boolean if the string saved successfully
 */
export function saveString(filepath: string, data: string): boolean {
	filepath = makeAbsolutePath(filepath);

	try {
		logger.debug("saving data to path:", filepath);
		// Make sure the directory exists for given file
		if (!PATH.isAbsolute(filepath)) filepath = PATH.resolve(filepath);
		FS.mkdirSync(PATH.dirname(filepath), { recursive: true });

		FS.writeFileSync(filepath, data, {
			encoding: "utf8",
			flag: "w",
		});
		return true;
	} catch (error) {
		logger.error("could not save data for path: " + filepath + "\n", error);
		return false;
	}
}
