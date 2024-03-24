import type {
	MutableRefObject,
	ReactElement,
	ReactNode,
	RefObject,
} from "react";
import React from "react";

type DomRef<E extends Element> = MutableRefObject<E | null>;

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
 */
export function endListener() {
	return (node: HTMLElement, done: () => void) => {
		node?.addEventListener(
			"transitionend",
			(e) => {
				if (e.target !== e.currentTarget) return;
				done();
			},
			false,
		);
	};
}
