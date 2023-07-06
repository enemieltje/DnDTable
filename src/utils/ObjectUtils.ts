import { LogManager, LogLevel } from "@utils";

const logger = LogManager.getLogger({
	name: "ObjectUtils",
	level: LogLevel.INFO,
});

/**
 * merges defaultObject types into object,
 * only when object does not contain or is not the same type.
 *
 * @param object will be checked, if not correct, replaces with defaultObject value!
 * @param defaultObject the object where the values are
 * used for types (and replaced with if incorrect)
 *
 * @returns the fully merged object
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any, complexity
export function typeCheckAndMerge<T>(object: any, defaultObject: T): T {
	if (isEmptyObject(object)) object = {};
	if (isEmptyObject(defaultObject)) return object;

	// check for every value in default object
	for (const key in defaultObject) {
		if (!key || key === "") continue;

		const defaultValue = defaultObject[key];
		const objectValue = object[key];

		if (Array.isArray(defaultValue) && !Array.isArray(objectValue)) {
			object[key] = defaultValue;
			continue;
		}

		// check if the object has key and are same type, else set to default
		if (objectValue === undefined || !isSameType(objectValue, defaultValue)) {
			logger.debug(
				"key is not the same type:",
				key,
				"defaultValue:",
				defaultValue,
				"objectValue:",
				objectValue
			);
			object[key] = defaultValue;
			continue;
		}

		// if value is object, also merge that object for deep merge
		if (isObject(defaultValue)) {
			logger.debug(
				"deep merging key object:",
				key,
				"defaultValue:",
				defaultValue,
				"objectValue:",
				objectValue
			);
			object[key] = typeCheckAndMerge(objectValue, defaultValue);
			continue;
		}
	}

	return object as T;
}

/**
 * merge two objects into one
 * @param arrays can be arrays or objects
 * @returns
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function merge(...arrays: any[]) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let final: any = Array.isArray(arrays[0]) ? [] : {};

	for (const source of arrays) {
		if (Array.isArray(final) && Array.isArray(source)) {
			final = final.concat(source);
			continue;
		}

		for (const prop in source) {
			if (!(prop in final)) {
				final[prop] = source[prop];
				continue;
			}

			if (Array.isArray(final[prop])) {
				final[prop] = final[prop].concat(source);
				continue;
			}

			if (isObject(final[prop])) {
				final[prop] = merge(final[prop], source[prop]);
				continue;
			}
		}
	}

	return final;
}

/**
 * checks if the object is an object and is not empty (by checking if keys == 0)
 */
export function isEmptyObject(object: unknown) {
	return !object || Object.keys(object).length == 0;
}

/**
 * checks for equivalent type and also checks for arrays because they are special
 */
export function isSameType(object: unknown, object2: unknown) {
	return typeof object === typeof object2 && Array.isArray(object) === Array.isArray(object2);
}

/**
 * gets the object from given string key
 *
 * @param seperator the seperator to use for the key. defaults to: "."
 *
 * @example
 * const testObject = {
 * 	test: {
 * 		cool: "yes"
 * 	}
 * }
 * const result = getFromStringKey(testObject, "test|cool", "|");
 * console.debug(result); // prints: "yes"
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getFromStringKey(object: any, keys: string, seperator = "."): any | undefined {
	const objectKeys = keys.includes(seperator) ? keys.split(seperator) : [keys];
	let obj = object;

	for (const key of objectKeys) {
		const objectValue = obj[key];
		obj = objectValue;
		if (!objectValue) break;
	}

	return obj;
}

/**
 * sets the given keystring with given value
 *
 * @param seperator the seperator to use for the key. defaults to: "."
 *
 * @example
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setFromStringKey(object: any, keys: string, value: unknown, seperator = ".") {
	const objectKeys = keys.includes(seperator) ? keys.split(seperator) : [keys];
	let obj = object;

	const lastkey = objectKeys.pop() as string;

	for (const keyPart of objectKeys) {
		let value = obj[keyPart];

		if (!value) {
			obj[keyPart] = {};
			value = obj[keyPart];
		}

		obj = value;
	}

	obj[lastkey] = value;
}

/**
 * checks if it is an actual object, because js
 *
 * @param object to check if it is an object
 * @returns if its a object or a fake
 */
export function isObject(object: unknown): object is object {
	const isobject = Object.prototype.toString.call(object) === "[object Object]";
	logger.debug(isobject + " Object: " + object);
	return isobject;
}
