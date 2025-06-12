import { Children, cloneElement, isValidElement } from "react";
import type { ReactElement } from "react";

/**
 * Given `this.props.children`, return an object mapping key to child.
 *
 * @param {*} children `this.props.children`
 * @return {object} Mapping of key to child
 */
export function getChildMapping(children: ReactElement, mapFn?: (child: ReactElement) => void) {
	let mapper = (child: ReactElement) => (mapFn && isValidElement(child) ? mapFn(child) : child);

	let result = Object.create(null);
	if (children)
		Children.map(children, (c) => c).forEach((child) => {
			// run the map function here instead so that the key is the computed one
			result[child.key!] = mapper(child);
		});
	return result;
}

/**
 * When you're adding or removing children some may be added or removed in the
 * same render pass. We want to show *both* since we want to simultaneously
 * animate elements in and out. This function takes a previous set of keys
 * and a new set of keys and merges them with its best guess of the correct
 * ordering. In the future we may expose some of the utilities in
 * ReactMultiChild to make this easy, but for now React itself does not
 * directly have this concept of the union of prevChildren and nextChildren
 * so we implement it here.
 *
 * @param {object} prev prev children as returned from
 * `ReactTransitionChildMapping.getChildMapping()`.
 * @param {object} next next children as returned from
 * `ReactTransitionChildMapping.getChildMapping()`.
 * @return {object} a key set that contains all keys in `prev` and all keys
 * in `next` in a reasonable order.
 */
export function mergeChildMappings(prev, next) {
	prev = prev || {};
	next = next || {};

	function getValueForKey(key) {
		return key in next ? next[key] : prev[key];
	}

	// For each key of `next`, the list of keys to insert before that key in
	// the combined list
	let nextKeysPending = Object.create(null);

	let pendingKeys: string[] = [];
	for (let prevKey in prev) {
		if (prevKey in next) {
			if (pendingKeys.length) {
				nextKeysPending[prevKey] = pendingKeys;
				pendingKeys = [];
			}
		} else {
			pendingKeys.push(prevKey);
		}
	}

	let i: number;
	let childMapping = {};
	for (let nextKey in next) {
		if (nextKeysPending[nextKey]) {
			for (i = 0; i < nextKeysPending[nextKey].length; i++) {
				let pendingNextKey = nextKeysPending[nextKey][i];
				childMapping[nextKeysPending[nextKey][i]] = getValueForKey(pendingNextKey);
			}
		}
		childMapping[nextKey] = getValueForKey(nextKey);
	}

	// Finally, add the keys which didn't appear before any key in `next`
	for (i = 0; i < pendingKeys.length; i++) {
		childMapping[pendingKeys[i]] = getValueForKey(pendingKeys[i]);
	}

	return childMapping;
}

function getProp(child: ReactElement, prop: string, props: Record<string, any>) {
	return props[prop] != null ? props[prop] : child.props[prop];
}

export function getInitialChildMapping(props: Record<string, any>, onExited: Function) {
	return getChildMapping(props.children, (child) => {
		return cloneElement(child, {
			onExited: onExited.bind(null, child),
			in: true,
			appear: getProp(child, "appear", props),
			enter: getProp(child, "enter", props),
			exit: getProp(child, "exit", props),
		});
	});
}

export function getNextChildMapping(nextProps: Record<string, any>, prevChildMapping, onExited: Function) {
	let nextChildMapping = getChildMapping(nextProps.children);
	let children = mergeChildMappings(prevChildMapping, nextChildMapping);

	Object.keys(children).forEach((key) => {
		let child = children[key];

		if (!isValidElement(child)) return;

		const hasPrev = key in prevChildMapping;
		const hasNext = key in nextChildMapping;

		const prevChild = prevChildMapping[key];
		const isLeaving = isValidElement(prevChild) && !(prevChild as ReactElement).props.in;

		// item is new (entering)
		if (hasNext && (!hasPrev || isLeaving)) {
			// console.log('entering', key)
			children[key] = cloneElement<any>(child, {
				onExited: onExited.bind(null, child),
				in: true,
				exit: getProp(child, "exit", nextProps),
				enter: getProp(child, "enter", nextProps),
			});
		} else if (!hasNext && hasPrev && !isLeaving) {
			// item is old (exiting)
			// console.log('leaving', key)
			children[key] = cloneElement<any>(child, { in: false });
		} else if (hasNext && hasPrev && isValidElement(prevChild)) {
			// item hasn't changed transition states
			// copy over the last transition props;
			// console.log('unchanged', key)
			children[key] = cloneElement<any>(child, {
				onExited: onExited.bind(null, child),
				in: (prevChild as ReactElement).props.in,
				exit: getProp(child, "exit", nextProps),
				enter: getProp(child, "enter", nextProps),
			});
		}
	});

	return children;
}
