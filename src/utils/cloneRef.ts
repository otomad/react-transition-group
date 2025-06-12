import type { ReactElement, ReactNode, Ref } from "react";
import React from "react";
import { majorVersionGeq19 } from "./forwardRef";
import { isObject } from "./isReactInstance";

type RefAttributes = { ref?: Ref<Element | null> };

/**
 * Remove read-only modifiers.
 *
 * @template T - Source object.
 */
type Writable<T> = { -readonly [Key in keyof T]: T[Key] };

/**
 * Check if a React Node is a valid React Element and **not a React Fragment**.
 *
 * @remarks
 * In React 19, `React.Fragment` won't accept any unknown props, when you unexpected pass other props to
 * `React.Fragment`, you will get a warning:
 *
 * > Invalid prop supplied to `React.Fragment`. React.Fragment can only have `key` and `children` props.
 *
 * It is best to disqualify the `React.Fragment` when you are testing `React.isValidElement()`.
 *
 * @param object - The React Node to test.
 * @returns The React Node is a valid React Element and **not a React Fragment**?
 */
export function isValidElement<P>(object: {} | null | undefined): object is ReactElement<P> {
	return React.isValidElement(object) && object?.type !== React.Fragment;
}

/**
 * Clones the provided children, replacing any refs with the provided nodeRef.
 * @remark Both render tree parent and declaration tree parent own the ref of child.
 * @param children - The ReactNode to clone and replace refs.
 * @param nodeRef - The RefObject to use as the new ref for any cloned elements with a ref.
 * @param additionalProps - Add additional custom props. You can also use a handler to return by getting the exist props, or keys.
 * @returns The cloned children with updated refs.
 */
export default function cloneRef(children: ReactNode, nodeRef: Ref<Element | null>): ReactNode {
	const child = React.Children.only(children);
	if (!isValidElement<RefAttributes>(child)) return child;
	const existedRef =
		!majorVersionGeq19 ?
			"ref" in child ?
				(child.ref as never)
			:	undefined
		:	child.props.ref;
	const ref = mergeRefs(nodeRef, existedRef);
	return React.cloneElement(child, {
		ref,
		key: child.key,
	});
}

/**
 * Sets a reference to a given value. This utility function handles both callback refs
 * and object refs, ensuring compatibility with React's `ref` system.
 *
 * @template T - The type of the value to set on the ref.
 * @param ref - The React ref to set. It can be either a callback ref or an object ref.
 * @param value - The value to assign to the ref.
 */
function setRef<T>(ref: Ref<T>, value: T) {
	if (typeof ref === "function") ref(value);
	else if (isObject(ref)) (ref as Writable<typeof ref>).current = value;
}

const MERGED_REF_SYMBOL = Symbol.for("react-transition-group-fc.merged_ref");
type MergedRef<T = Element | null> = React.RefCallback<T> & {
	refs: Set<Ref<T>>;
	[MERGED_REF_SYMBOL]: true;
};

/**
 * Checks if the given ref is returned by function `mergeRefs`.
 */
function isMergedRef<T>(ref: Ref<T>): ref is MergedRef<T> {
	return typeof ref === "function" && MERGED_REF_SYMBOL in ref;
}

/**
 * Merges multiple React refs into a single ref callback.
 * This allows you to pass multiple refs to a single element, ensuring all refs are updated
 * with the same element reference.
 *
 * @param refs - An array of React refs to be merged. Each ref can be a callback ref or a ref object.
 * @returns A ref callback function that updates all provided refs with the given element.
 */
export function mergeRefs(...refs: (Ref<Element | null> | undefined | null)[]) {
	const mergedRef = ((el) => {
		for (const ref of mergedRef.refs) setRef(ref, el);
	}) as MergedRef;
	mergedRef.refs = new Set();
	for (const ref of refs)
		if (!ref) continue;
		else if (isMergedRef(ref)) ref.refs.forEach((ref) => mergedRef.refs.add(ref));
		else mergedRef.refs.add(ref);
	mergedRef[MERGED_REF_SYMBOL] = true;
	return mergedRef;
}
