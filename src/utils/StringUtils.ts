import { LogManager, LogLevel } from "@utils";

// const console = LogManager.getconsole({
// 	name: "StringUtils",
// 	level: LogLevel.INFO,
// });

/**
 * @returns true if given string is empty
 */
export function isEmptyString(string: string | undefined): string is undefined {
	return string == null || string.length === 0;
}

/**
 * gets the name of the function that called this function (or given level)
 * @param level the level in the stacktrace to get the
 * @returns
 */
export function getFunctionName(level = 1): string {
	const stack = new Error().stack;
	if (!stack) return "";

	let line = String(stack);

	for (let i = 0; i < level + 1; i++) {
		line = line.substring(line.indexOf("\n") + 1);
	}

	const funcName = line.substring(7);
	return funcName.substring(0, funcName.indexOf(" "));
}

/**
 * capture a stacktrace with given level
 * @param level the level to get the stacktrace from, defaults to 1
 * (to get from the caller of this function)
 * @returns a stacktrace of the given level
 */
export function captureStackTrace(level = 1, formatted = false): string {
	const stack = new Error().stack;
	if (!stack) return "";

	let stacktrace = String(stack);

	// this shit is done to remove this function
	// and the function that called this from the stack trace
	for (let i = 0; i < level + 1; i++) {
		stacktrace = stacktrace.substring(stacktrace.indexOf("\n") + 1);
	}

	if (formatted) return stacktrace;

	return stacktrace.replaceAll("    ", "");
}

/**
 * checks if the given string is a valid locale string: example of valid: "nl-NL"
 *
 * checks it by seeing if length = 5, mid char is a "-",
 * and first two chars are lower and last two are upper case
 */
export function isValidLocale(string: string): boolean {
	if (string.length !== 5) return false;
	const first = string.substring(0, 2);
	const mid = string.charAt(2);
	const second = string.substring(2);

	const isCorrectCase = first.toLowerCase() == first && second.toUpperCase() == second;
	const midissep = mid === "-";
	return isCorrectCase && midissep;
}

/**
 * makes a valid locale string from given string: example of valid: "nl-NL"
 * @see isValidLocale
 *
 * @example
 * const valid = makeValidLocale("nl");
 * console.debug(valid); // prints: "nl-NL"
 */
export function makeValidLocale(string: string): string {
	if (isEmptyString(string)) return "en-GB";

	if (string.length > 5) string = string.substring(0, 5);

	if (isValidLocale(string)) return string;

	if (string.length === 5) {
		const first = string.substring(0, 2);
		const second = string.substring(3);

		return first.toLowerCase() + "-" + second.toUpperCase();
	}

	if (string.length == 2) {
		return string.toLowerCase() + "-" + string.toUpperCase();
	}

	return "en-GB";
}

/**
 * get a timestamp in given format
 *
 * @param format the format to use, default:
 * {hour}:{minute}:{seconds} {day}/{month}/{year}
 * @param date the date to use for the variables
 * @returns a string with the timestamp formatted as format
 */
export function getTimeStamp(
	format = "{hour}:{minute}:{seconds} {day}/{month}/{year}",
	date = new Date()
) {
	const year = date.getFullYear().toString();
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const day = date.getDate().toString().padStart(2, "0");

	const hour = date.getHours().toString().padStart(2, "0");
	const minute = date.getMinutes().toString().padStart(2, "0");
	const seconds = date.getSeconds().toString().padStart(2, "0");
	const milliseconds = date.getMilliseconds().toString().padStart(3, "0");

	const timestamp = replaceWithName(
		{ string: format, addToEnd: false },
		{ day, month, year, hour, minute, seconds, milliseconds }
	);

	console.debug(`\n\ttimestamp: ${timestamp}`);

	return timestamp;
}

/**
 * counts the character length after the last case of a specified character
 */
export function CountCharAfterLast(string: string, after: string) {
	return string.length - string.lastIndexOf(after);
}

/**
 * counts the character length after the first case of as specified character
 */
export function CountCharAfterFirst(string: string, after: string) {
	return string.length - string.indexOf(after);
}

/**
 * @returns true if every given argument is in string
 */
export function includesAll(string: string, ...args: string[]): boolean {
	if (isEmptyString(string) && args.length === 0) return true;

	// console.debug("checking if string:", string, "includes all of:", args);

	for (const arg of args) {
		if (!string.includes(arg)) return false;
	}

	return true;
}

/**
 * @returns true if includes one of given argument in string
 */
export function includesOne(string: string, ...args: string[]) {
	if (isEmptyString(string) && args.length === 0) return true;

	console.debug("checking if string:", string, "includes one of:", args);

	for (const arg of args) {
		if (string.includes(arg)) return true;
	}

	return false;
}

/**
 * @returns true if string starts with one of the arguments
 */
export function beginsWithOne(string: string, ...args: string[]) {
	if (isEmptyString(string) && args.length === 0) return true;

	console.debug("checking if string:", string, "begins with one of:", args);

	for (const arg of args) {
		if (string.startsWith(arg)) return true;
	}

	return false;
}

/**
 * gets the string before a certain value back to after value.
 * NOTE: first occurrence from first occurrence only
 *
 * @see getLastBetweenValues
 *
 * @example
 * const teststring = "this is is a test sting test";
 * const value = getBetweenValues(teststring, "is", "test");
 * console.debug(value); // this will log " is a "
 */
export function getBetweenValues(string: string, before: string, after: string) {
	console.debug(
		"checking if string:",
		string,
		"after value:",
		after,
		"and before value:",
		before
	);

	const startIndex = string.indexOf(before);
	const endIndex = string.indexOf(after, startIndex + before.length);

	const containsValues = startIndex !== -1 && endIndex !== -1;
	return containsValues ? string.substring(startIndex + before.length, endIndex) : "";
}

/**
 * gets the string before a certain value back to after value.
 * NOTE: last occurrence from first occurrence
 *
 * @see getBetweenValues
 *
 * @example
 * const teststring = "this is is a test sting test";
 * const value = getBetweenValues(teststring, "is", "test");
 * console.debug(value); // this will log " a "
 */
export function getLastBetweenValues(string: string, afterLast: string, before: string) {
	console.debug(
		"checking if string:",
		string,
		"after last value of:",
		afterLast,
		"and before value:",
		before
	);

	const firstpart = string.substring(0, string.indexOf(before));
	const lastOfFirstPart = firstpart.substring(
		firstpart.lastIndexOf(afterLast) + afterLast.length
	);
	return lastOfFirstPart;
}

/**
 * get the max length of given strings
 *
 * @param stringArray an array of strings, or given arguments
 * @returns number of characters for longest string
 */
export function maxStringLength(...stringArray: string[]) {
	const maxLength = Math.max(...stringArray.map(str => str.length));

	//console.debug("longest string length is " + maxLength + " from:", ...stringArray);

	return maxLength;
}

/**
 * will limit characters, option to add a ... at the end
 *
 * @default addEllipsis false
 * @example
 * const string = "this is a long string"
 * console.debug(truncate(string, 14, true)); // prints: this is a l...
 */
export function truncate(string: string, maxLength: number, addEllipsis = false): string {
	if (isEmptyString(string)) return "";
	if (string.length <= maxLength) return string;

	let output = string.substring(0, addEllipsis ? maxLength - 3 : maxLength);
	if (addEllipsis) output += "...";

	return output;
}

interface ReplaceArgsOptions {
	string: string;
	addToEnd: boolean;
}

/**
 * replaces all the occurrences of "{n}" where n is number of the arg
 * @param args the number of args, ideal if the same length as max n
 */
export function replaceWithArgs(string: string | ReplaceArgsOptions, ...args: string[]) {
	let addToEnd = true;

	if (!(typeof string === "string")) {
		addToEnd = string.addToEnd;
		string = string.string;
	}

	if (isEmptyString(string)) return "";
	if (args.length === 0) return string;

	let count = 0;
	let newstring = String(string);

	for (const arg of args) {
		const indicator = "{" + count + "}";

		if (!newstring.includes(indicator)) {
			// There are more args than there are placeholders
			if (addToEnd) newstring += " | " + count + ":" + arg;
			continue;
		}

		newstring = newstring.replaceAll(indicator, arg);
		count += 1;
	}

	console.debug(
		"filling string with args:",
		args,
		"with string:",
		string,
		"to string:",
		newstring
	);

	return newstring;
}

interface ReplaceNameOptions {
	string: string;
	addToEnd?: boolean;
	removeDoubleSpace?: boolean;
	indicators?: {
		front: string;
		back: string;
	};
}

/**
 * replaces all the occurrences of "{n}" where n is name of the key in replaceList
 * @param replaceList the list of replacements
 */
export function replaceWithName(
	option: ReplaceNameOptions | string,
	replaceList: Record<string, string | undefined>
) {
	if (typeof option === "string") option = { string: option };
	const {
		string,
		addToEnd = true,
		removeDoubleSpace = true,
		indicators = { front: "{", back: "}" },
	} = option;

	if (isEmptyString(string) && !addToEnd) return "";
	if (Object.keys(replaceList).length === 0) return string;

	let newstring = String(string);

	for (const [key, replacement] of Object.entries(replaceList)) {
		const indicator = indicators.front + key + indicators.back;

		if (!newstring.includes(indicator)) {
			// There are more keys than there are placeholders
			if (addToEnd) newstring += ` | ${indicator}: ${replacement}`;
			continue;
		}

		if (isEmptyString(replacement)) {
			// The key does not have a value, so set it to empty string
			newstring = newstring.replaceAll(indicator, "");
			continue;
		}

		newstring = newstring.replaceAll(indicator, replacement);
	}

	return removeDoubleSpace ? newstring.replaceAll("  ", " ") : newstring;
}

/**
 * replaces last instance of toReplace with replaceWith
 */
export function replaceLast(string: string, toReplace: string, replaceWith: string): string {
	// First check if it is even included before we do more ops
	if (isEmptyString(string) || !string.includes(toReplace)) return string;

	const lastIndex = string.lastIndexOf(toReplace);
	const final =
		string.substring(0, lastIndex) +
		replaceWith +
		string.substring(lastIndex + toReplace.length);

	console.debug(
		"\n\tstring: \n\t\t" +
			string +
			"\n\ttoReplace: \n\t\t" +
			toReplace +
			"\n\treplaceWith: \n\t\t" +
			replaceWith +
			"\n\tfinal: \n\t\t" +
			final
	);

	return final;
}

/**
 * checks all arguments to see if it is the same as string, ignoring case
 * @returns true if one of the args is equalsIgnoreCase
 */
export function equalsIgnoreCase(string: string, ...args: string[]): boolean {
	// If there is no argument, we check if string is nothing
	if (args.length === 0 && isEmptyString(string)) return true;

	let bool = false;

	const upperString = string.toLowerCase();

	for (const arg of args) {
		if (arg != null && typeof arg === "string" && upperString == arg.toLowerCase()) bool = true;
	}

	console.debug(
		bool + "\n\tstring: \n\t\t" + string + "\n\tcomparestring: \n\t\t" + args.join("\n")
	);

	return bool;
}

/**
 * checks all arguments to see it is in the string, ignoring case
 * @returns true if string includes one of the args
 */
export function includesIgnoreCase(string: string, ...args: string[]): boolean {
	if (args.length === 0 && isEmptyString(string)) return true;

	const upperString = string.toLowerCase();

	for (const arg of args) {
		if (arg && upperString.includes(arg.toLowerCase())) {
			console.debug("true\n\tstring:\n\t\t" + string + "\n\tcompare string:\n\t\t" + arg);
			return true;
		}
	}

	console.debug(
		"false\n\tstring:\n\t\t" + string + "\n\tcompare string:\n\t\t" + args.join("\n")
	);

	return false;
}

/**
 * tries to split at last instance of separator.
 *
 * if the string does not contain separator or is empty,
 * the second element in array will be an empty string (or both if string also empty)
 *
 * @returns an array of two items, one before last separator and one after
 */
export function splitAtLast(string: string, separator: string): string[] {
	if (isEmptyString(string) || !string.includes(separator)) return [string || "", ""];

	const index = string.lastIndexOf(separator);
	const first = string.substring(0, index);
	const last = string.substring(index + separator.length);

	const result = [first, last];

	console.debug("string to split:", string, "and seperating at:", separator, "result: ", result);

	return result;
}

/**
 * compares two strings in similarity, return true if more equal than minSimilarity
 *
 * @param {float} minSimilarity percentage (float) that should be similar to return true
 * @returns {boolean} if is more than minSimilarity
 */
export function deepCompare(str1: string, str2: string, minSimilarity = 0.8): boolean {
	if (str1 == str2) return true;

	// now we want to check what parts are the same.
	const distance = levenshteinDistance(str1, str2);

	// and then check to the length of the whole string
	// if its more than percentage the same
	const MaxLength = Math.max(str1.length, str2.length);
	const matchingChars = MaxLength - distance;
	const similarity = matchingChars / MaxLength;

	const isSimilar = similarity >= minSimilarity;

	console.debug(
		"\n\tmatchingChars: " +
			matchingChars +
			"\n\tdistance: " +
			distance +
			"\n\tMaxLength: " +
			MaxLength +
			"\n\tsimilarity: " +
			similarity +
			"\n\tisSimilar: " +
			isSimilar
	);

	return isSimilar;
}

/**
 * explained here: https://github.com/gustf/js-levenshtein
 * @returns {number} the number of edits it has to do to get to the other string
 */
// eslint-disable-next-line complexity
export function levenshteinDistance(a: string, b: string): number {
	if (a === b) {
		return 0;
	}

	if (a.length > b.length) {
		const tmp = a;
		a = b;
		b = tmp;
	}

	let la = a.length;
	let lb = b.length;

	while (la > 0 && a.charCodeAt(la - 1) === b.charCodeAt(lb - 1)) {
		la--;
		lb--;
	}

	let offset = 0;

	while (offset < la && a.charCodeAt(offset) === b.charCodeAt(offset)) {
		offset++;
	}

	la -= offset;
	lb -= offset;

	if (la === 0 || lb < 3) {
		return lb;
	}

	let x = 0;
	let y;
	let d0;
	let d1;
	let d2;
	let d3;
	let dd = 0;
	let dy;
	let ay;
	let bx0;
	let bx1;
	let bx2;
	let bx3;

	const vector = [];

	for (y = 0; y < la; y++) {
		vector.push(y + 1);
		vector.push(a.charCodeAt(offset + y));
	}

	const len = vector.length - 1;

	for (; x < lb - 3; ) {
		bx0 = b.charCodeAt(offset + (d0 = x));
		bx1 = b.charCodeAt(offset + (d1 = x + 1));
		bx2 = b.charCodeAt(offset + (d2 = x + 2));
		bx3 = b.charCodeAt(offset + (d3 = x + 3));
		dd = x += 4;

		for (y = 0; y < len; y += 2) {
			dy = vector[y];
			ay = vector[y + 1];
			d0 = _min(dy || 0, d0 || 0, d1, bx0, ay || 0);
			d1 = _min(d0, d1, d2, bx1, ay || 0);
			d2 = _min(d1, d2, d3, bx2, ay || 0);
			dd = _min(d2, d3, dd, bx3, ay || 0);
			vector[y] = dd;
			d3 = d2;
			d2 = d1;
			d1 = d0;
			d0 = dy;
		}
	}

	for (; x < lb; ) {
		bx0 = b.charCodeAt(offset + (d0 = x));
		dd = ++x;

		for (y = 0; y < len; y += 2) {
			dy = vector[y];
			vector[y] = dd = _min(dy || 0, d0 || 0, dd, bx0, vector[y + 1] || 0);
			d0 = dy;
		}
	}

	return dd;
}

function _min(d0: number, d1: number, d2: number, bx: number, ay: number): number {
	return d0 < d1 || d2 < d1 ? (d0 > d2 ? d2 + 1 : d0 + 1) : bx === ay ? d1 : d1 + 1;
}
