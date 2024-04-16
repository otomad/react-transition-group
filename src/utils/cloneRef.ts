import type { MutableRefObject, ReactElement, ReactNode } from "react";
import React from "react";

type DomRef<E extends Element> = MutableRefObject<E | null>;

/**
 * Checks if the given ReactNode has a ref property.
 *
 * @param reactNode The ReactNode to check for a ref.
 * @returns A boolean value indicating whether the ReactNode has a ref property.
 */
export function hasRefInReactNode(
	reactNode: unknown,
): reactNode is { ref: MutableRefObject<Element | null> } {
	return !!(
		reactNode &&
		typeof reactNode === "object" &&
		"ref" in reactNode &&
		reactNode.ref
	);
}

/**
 * Clones the provided ReactNode and updates the refs to point to the provided nodeRef.
 *
 * @param children The ReactNode to clone and update the refs.
 * @param nodeRef The MutableRefObject to use as the new ref for the cloned children.
 * @returns The cloned ReactNode with updated refs.
 */
export function cloneRef(
	children: ReactNode,
	nodeRef: MutableRefObject<Element | null>,
) {
	return React.createElement(
		React.Fragment,
		null,
		React.Children.map(children, (child: ReactNode) => {
			if (hasRefInReactNode(child)) {
				// useImperativeHandle(child.ref, () => nodeRef.current!, []);
				// child.ref.current = nodeRef.current;
				delete (child.ref as Partial<DomRef<Element>>).current;
				Object.defineProperty(child.ref, "current", {
					configurable: true,
					enumerable: true,
					get: () => nodeRef.current,
					set: (value) => (nodeRef.current = value),
				});
			}
			return React.cloneElement(child as ReactElement, {
				ref: nodeRef,
			});
		}),
	);
}

/**
 * Used to obtain when the element animation ends, to help automatically obtain the animation time.
 *
 * @returns A function that can be used to remove the event listener when it's no longer needed.
 */
export function endListener() {
	/**
	 * @param node The HTMLElement to listen for the "transitionend" event.
	 * @param done A callback function to be executed when the animation ends.
	 */
	return (node: HTMLElement, done: () => void) => {
		const listener = (e: TransitionEvent) => {
			if (e.target !== e.currentTarget) return;
			node?.removeEventListener("transitionend", listener, false);
			done();
		};
		node?.addEventListener("transitionend", listener, false);
	};
}
