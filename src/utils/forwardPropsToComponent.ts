import type { ReactNode, RefObject } from "react";
import type { TransitionProps } from "../Transition";
import cloneRef from "./cloneRef";
import endListener from "./endListener";
import { canFindDOMNode } from "./findDOMNode";

export default function forwardPropsToComponent<TProps extends TransitionProps>(
	props: TProps,
	nodeRef: RefObject<HTMLElement | null>,
) {
	return {
		...props,
		...(props.timeout != null && canFindDOMNode() ?
			{ timeout: props.timeout }
		: props.timeout != null ? { nodeRef, timeout: props.timeout }
		: {
				nodeRef,
				addEndListener:
					props.addEndListener ??
					endListener(
						props.maxTimeout,
						props.requestAnimationFrame,
						props.transitionEndProperty,
					),
			}),
		children: cloneRef(props.children as ReactNode, nodeRef),
	};
}
