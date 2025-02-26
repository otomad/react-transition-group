import type { MutableRefObject, ReactElement, ReactNode } from "react";
import React from "react";
import { majorVersionGeq19 } from "./forwardRef";
import { isObject } from "./isReactInstance";

type DomRef<E extends Element> = MutableRefObject<E | null>;

/**
 * Checks if the given ReactNode has a ref property.
 *
 * @param reactNode The ReactNode to check for a ref.
 * @returns A boolean value indicating whether the ReactNode has a ref property.
 */
export function hasRefInReactNode(reactNode: unknown): reactNode is {
	ref: MutableRefObject<Element | null>;
	props: { ref: React.RefObject<Element | null> };
} {
	if (!majorVersionGeq19)
		return !!(isObject(reactNode) && "ref" in reactNode && reactNode.ref);
	else
		return !!(
			isObject(reactNode) &&
			"props" in reactNode &&
			isObject(reactNode.props) &&
			"ref" in reactNode.props &&
			reactNode.props.ref
		);
}

/**
 * Clones the provided ReactNode and updates the refs to point to the provided nodeRef.
 *
 * @param children The ReactNode to clone and update the refs.
 * @param nodeRef The MutableRefObject to use as the new ref for the cloned children.
 * @returns The cloned ReactNode with updated refs.
 */
export default function cloneRef(
	children: ReactNode,
	nodeRef: MutableRefObject<Element | null>,
) {
	const child = React.Children.only(children);
	if (hasRefInReactNode(child)) {
		// useImperativeHandle(child.ref, () => nodeRef.current!, []);
		// child.ref.current = nodeRef.current;
		const ref = !majorVersionGeq19 ? child.ref : child.props.ref;
		delete (ref as Partial<DomRef<Element>>).current;
		Object.defineProperty(ref, "current", {
			configurable: true,
			enumerable: true,
			get: () => nodeRef.current,
			set: (value) => (nodeRef.current = value),
		});
	}
	return React.cloneElement(child as ReactElement, {
		ref: nodeRef,
	});
}
