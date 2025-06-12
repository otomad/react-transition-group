/**
 * Creates a new object composed of the picked `object` properties.
 * @category Object
 * @param object - The source object.
 * @param pickedKeys - keys of properties you want to pick from the object, specified in arrays.
 * @returns Returns the new object.
 * @example
 * ```javascript
 * pick({ a: 1, b: 2, c: 3 }, ["a", "c"]); // { a: 1, c: 3 }
 * ```
 */
export function pick<T extends object, U extends keyof T>(object: T, pickedKeys: U[]): Pick<T, U>;
/**
 * Creates a new object composed of the `object` properties `predicate` returns truthy for.
 * @category Object
 * @param object - The source object.
 * @param predicate - The function to predicted whether the property should be picked.
 * - `currentValue`: the current value processed in the object.
 * - `key`: the key of the `currentValue` in the object.
 * - `object`: the object `pick` was called upon.
 * @param thisArg - The object used as `this` inside the predicted function.
 * @returns Returns the new object.
 * @example
 * ```javascript
 * pick({ a: 1, b: "2", c: 3 }, x => typeof x === "number"); // { a: 1, c: 3 }
 * ```
 */
export function pick<T extends object>(
	object: T,
	predicate: (currentValue: T[keyof T], key: keyof T, object: T) => boolean,
	thisArg?: any,
): Partial<T>;
export function pick<T>(object: T, predicate: ObjectPickOmitPredicate<T> = [], thisArg?: unknown) {
	return _objectPickOrOmit(true, object, predicate, thisArg);
}

/**
 * Creates a new object composed of the own and inherited enumerable properties of `object` that are not omitted.
 * @category Object
 * @param object - The source object.
 * @param omittedKeys - keys of properties you want to omit from the object, specified in arrays.
 * @returns Returns the new object.
 * @example
 * ```javascript
 * omit({ a: 1, b: 2, c: 3 }, ["a", "c"]); // { b: 2 }
 * ```
 */
export function omit<T extends object, U extends keyof T>(object: T, omittedKeys: U[]): Omit<T, U>;
/**
 * creates a new object composed of the own and inherited enumerable properties of `object` that `predicate` doesn't return truthy for.
 * @category Object
 * @param object - The source object.
 * @param predicate - The function to predicted whether the property should be omitted.
 * - `currentValue`: the current value processed in the object.
 * - `key`: the key of the `currentValue` in the object.
 * - `object`: the object `omit` was called upon.
 * @param thisArg - The object used as `this` inside the predicted function.
 * @returns Returns the new object.
 * @example
 * ```javascript
 * omit({ a: 1, b: "2", c: 3 }, x => typeof x === "number"); // { b: "2" }
 * ```
 */
export function omit<T extends object>(
	object: T,
	predicate: (currentValue: T[keyof T], key: keyof T, object: T) => boolean,
	thisArg?: any,
): Partial<T>;
export function omit<T>(object: T, predicate: ObjectPickOmitPredicate<T> = [], thisArg?: unknown) {
	return _objectPickOrOmit(false, object, predicate, thisArg);
}

type ObjectPickOmitPredicate<T> = (keyof T)[] | ((currentValue: T[keyof T], key: keyof T, object: T) => boolean);
function _objectPickOrOmit<T>(
	isPick: boolean,
	object: T,
	predicate: ObjectPickOmitPredicate<T>,
	thisArg?: unknown,
): Partial<T> {
	if (typeof predicate !== "function") {
		const keys = predicate;
		predicate = (_, key) => keys.includes(key);
	}
	if (thisArg != null) predicate = predicate.bind(thisArg) as typeof predicate;
	const descriptors = Object.getOwnPropertyDescriptors(object) as Record<string | symbol, PropertyDescriptor>;
	for (const key of Reflect.ownKeys(descriptors)) {
		const descriptor = descriptors[key];
		const value = "value" in descriptor ? descriptor.value : descriptor.get?.();
		const predicted = predicate(value, key as keyof T, object);
		if (isPick !== predicted) delete descriptors[key];
	}
	return Object.create(Object.getPrototypeOf(object), descriptors);
}
