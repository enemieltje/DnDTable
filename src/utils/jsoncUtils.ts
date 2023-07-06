import { StringUtils, LogManager, LogLevel } from "@utils";

const logger = LogManager.getLogger({
	name: "LangUtils",
	level: LogLevel.INFO,
});

/**
 * a map where the keys are dot based: "some.deep.key"
 * and the value might be something like: "test\n//test"
 */
export type commentMap = Record<string, string>;

/**
 * this will take a string of formatted jsonc and remove any multi or single line comments.
 * will keep the newlines, does not check for json correctness.
 *
 * cannot guarantee accuracy as of 2/4/23
 *
 * @version 0.0.4
 *
 * @param jsonString should be a formatted jsonc string!
 * @returns a stripped json string (hopefully)
 */
export function stripJsonComments(jsonString: string): string {
	const singleComment = Symbol("singleComment");
	const multiComment = Symbol("multiComment");

	let isInsideString: symbol | boolean = false;
	let isInsideComment: symbol | boolean = false;
	let offset = 0;
	let buffer = "";

	logger.debug("beginning!");
	const then = Date.now();

	for (let index = 0; index < jsonString.length; index++) {
		const currentCharacter = jsonString.charAt(index);
		const nextCharacter = jsonString.charAt(index + 1);

		if (!isInsideComment && currentCharacter === '"') {
			// Enter or exit string
			const escaped = isEscaped(jsonString, index);

			if (!escaped) {
				isInsideString = !isInsideString;
			}
		}

		if (isInsideString) {
			continue;
		}

		if (!isInsideComment && currentCharacter + nextCharacter === "//") {
			// Enter single-line comment
			buffer += jsonString.slice(offset, index);
			offset = index;
			isInsideComment = singleComment;
			index++;
		} else if (
			isInsideComment === singleComment &&
			currentCharacter + nextCharacter === "\r\n"
		) {
			// Exit single-line comment via \r\n
			index++;
			isInsideComment = false;
			buffer += strip(jsonString, offset, index);
			offset = index;
			continue;
		} else if (isInsideComment === singleComment && currentCharacter === "\n") {
			// Exit single-line comment via \n
			isInsideComment = false;
			buffer += strip(jsonString, offset, index);
			offset = index;
		} else if (!isInsideComment && currentCharacter + nextCharacter === "/*") {
			// Enter multiline comment
			buffer += jsonString.slice(offset, index);
			offset = index;
			isInsideComment = multiComment;
			index++;
			continue;
		} else if (isInsideComment === multiComment && currentCharacter + nextCharacter === "*/") {
			// Exit multiline comment
			index++;
			isInsideComment = false;
			buffer += strip(jsonString, offset, index + 1);
			offset = index + 1;
			continue;
		}
	}

	const resultdata =
		buffer + (isInsideComment ? strip(jsonString.slice(offset)) : jsonString.slice(offset));

	logger.debug("finished in: " + (Date.now() - then) + "ms");

	return resultdata;
}

interface commentJSON {
	validJSONString: string;
	commentMap: commentMap;
}

/**
 * this will take a string of formatted jsonc and remove any multi or single line comments.
 * will keep the newlines, does not check for json correctness.
 *
 * also returns the comments with correct depth
 *
 * cannot guarantee accuracy as of 2/4/23
 *
 * //TODO: fix and improve
 *
 * @version 0.0.4
 *
 * @param jsonString should be a formatted jsonc string!
 * @returns a stripped json string (hopefully) and the comments in it
 */
export function decodeJsonComments(jsonString: string): commentJSON {
	const splitString = jsonString.split("\n");

	let validJSONString = "";
	let innerObject = "";
	const commentMap: commentMap = {};

	let commentString = "";
	let getNextValue = false;
	let isInsideMultiline = false;

	logger.debug("beginning!");
	const then = Date.now();

	for (const line of splitString) {
		const newLine = line + "\n";
		const trimmed = line.trim();

		// if is inside a multiline (bool) then check if this line is last version
		if (isInsideMultiline) {
			// check if the multiline is ending
			if (trimmed.includes("*/")) {
				isInsideMultiline = false;
				getNextValue = true;
				commentString += trimmed.substring(0, trimmed.indexOf("*/") + 2) + "\n";
			} else {
				commentString += trimmed + "\n";
			}

			continue;
		}

		// check if the line is a singleline comment (so begins with a //)
		if (trimmed.startsWith("//")) {
			// add comment to map on next line iteration
			getNextValue = true;
			commentString = line;
			continue;
		}

		// check if line is beginning of multiline comment
		if (trimmed.startsWith("/*")) {
			// add comment to map on next line iteration
			isInsideMultiline = true;
			commentString += newLine.substring(newLine.indexOf("/*"));
			continue;
		}

		// the line is not a comment, so we expect valid json
		if (line.includes("}"))
			innerObject = innerObject.substring(0, innerObject.lastIndexOf("."));

		// check if it is a key:value part of object
		if (line.includes(":")) {
			const key = line.substring(0, line.indexOf(":")).trim().replaceAll('"', "");
			const value = line.substring(line.indexOf(":") + 1).trim();

			// if getNextValue, then we got a comment and we need to get the key
			if (getNextValue) {
				const commentKey = innerObject.length != 0 ? innerObject + "." + key : key;
				commentMap[commentKey] = commentString.trim();
				commentString = "";
				getNextValue = false;
			}

			// if the value is a { it will go 1 deeper in object
			if (value == "{") {
				innerObject += innerObject.length != 0 ? "." + key : key;
			}
		}

		validJSONString += newLine;
	}

	logger.debug("finished in: " + (Date.now() - then) + "ms");

	return { validJSONString, commentMap };
}

/**
 * gets a parsed JSON object, in string format, and prepend comments to it
 *
 * this is in the jsonc format, and can be decoded with the "stripJsonComments" function
 * @see stripJsonComments
 *
 * //TODO: fix and improve
 * //TODO: don't search after part for and replace... wasting, just use specific line?
 *
 * cannot guarantee accuracy as of 10/4/23
 *
 * @version 0.1.4
 * @throws An error if the JSON object is not valid or if a key in the comment map does not exist in the JSON object.
 */
export function addJsonComments(json: unknown, commentMap: commentMap, addNewLine = true): string {
	let jsonString = JSON.stringify(json, null, "\t");

	let firstOne = true;

	logger.debug("beginning!");
	const then = Date.now();

	for (const key in commentMap) {
		//get correct object
		const test = `"${key}"`;
		const isDeep = key.includes(".");
		const toReplace = isDeep ? getStringObject(jsonString, key) : test;

		if (!jsonString.includes(toReplace)) continue;

		const prefix = `\n${StringUtils.getLastBetweenValues(jsonString, "\n", toReplace)}`;
		const spacing = firstOne ? "" : addNewLine ? "\n" : "";
		const rawComment = commentMap[key];
		const comment = `${spacing}${prefixWithComment(
			rawComment,
			rawComment?.startsWith("/*") || false
		)}`;
		const commentWithPrefix = comment.replace(/\n/g, prefix) + prefix;
		const withComment = commentWithPrefix + toReplace;
		firstOne = false;

		jsonString = jsonString.replace(toReplace, withComment);
	}

	logger.debug("finished in: " + (Date.now() - then) + "ms");

	return jsonString;
}

function getStringObject(jsonString: string, keys: string) {
	const objectKeys = keys.split(".");
	let part = jsonString;

	for (const key of objectKeys) {
		const toSplit = `"${key}"`;
		const after = part.substring(part.indexOf(toSplit) + toSplit.length);
		part = `${after || ""}`;
	}

	return `"${objectKeys.pop()}"` + part;
}

function prefixWithComment(commentstring: string | undefined, isMulti: boolean): string {
	if (StringUtils.isEmptyString(commentstring)) return "";

	if (commentstring.includes("\n")) {
		// we have linebreak, check every instance
		return commentstring
			.split("\n")
			.map(part => prefixWithComment(part, isMulti))
			.join("\n");
	}

	if (!StringUtils.beginsWithOne(commentstring.trim(), "//", "/*", "*")) {
		return `${isMulti ? "*" : "//"} ${commentstring}`;
	}

	return commentstring;
}

function isEscaped(jsonString: string, quotePosition: number) {
	let index = quotePosition - 1;
	let backslashCount = 0;

	while (jsonString[index] === "\\") {
		index -= 1;
		backslashCount += 1;
	}

	return Boolean(backslashCount % 2);
}

function strip(string: string, start?: number, end?: number) {
	return string.slice(start, end).replace(/\S/g, " ");
}
