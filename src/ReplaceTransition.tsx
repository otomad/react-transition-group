import React from "react";
import { keys } from "ts-transformer-keys";
import TransitionGroup from "./TransitionGroup";
import type { TransitionEventProps } from "./Transition";
import findDOMNode from "./utils/findDOMNode";
import { omit } from "./utils/pick-omit";

export const replaceTransitionPropKeys = keys<ReplaceTransitionProps>();

/**
 * The `<ReplaceTransition>` component is a specialized `Transition` component
 * that animates between two children.
 *
 * ```jsx
 * <ReplaceTransition in>
 *   <Fade><div>I appear first</div></Fade>
 *   <Fade><div>I replace the above</div></Fade>
 * </ReplaceTransition>
 * ```
 */
class ReplaceTransition extends React.Component<ReplaceTransitionProps> {
	handleEnter = (...args) => this.handleLifecycle("onEnter", 0, args);
	handleEntering = (...args) => this.handleLifecycle("onEntering", 0, args);
	handleEntered = (...args) => this.handleLifecycle("onEntered", 0, args);

	handleExit = (...args) => this.handleLifecycle("onExit", 1, args);
	handleExiting = (...args) => this.handleLifecycle("onExiting", 1, args);
	handleExited = (...args) => this.handleLifecycle("onExited", 1, args);

	private handleLifecycle(handler: string, index: number, originalArgs) {
		const { children } = this.props;
		const child = React.Children.toArray(children)[index] as React.ReactElement;

		if (child.props[handler]) child.props[handler](...originalArgs);
		if (this.props[handler]) {
			const maybeNode = child.props.nodeRef ? undefined : findDOMNode(this);

			this.props[handler](maybeNode);
		}
	}

	render() {
		const props = omit(this.props, replaceTransitionPropKeys);
		const { children, in: inProp } = this.props;
		const [first, second] = React.Children.toArray(children) as React.ReactElement[];

		return (
			<TransitionGroup.Component {...props}>
				{inProp ?
					React.cloneElement(first, {
						key: "first",
						onEnter: this.handleEnter,
						onEntering: this.handleEntering,
						onEntered: this.handleEntered,
					})
				:	React.cloneElement(second, {
						key: "second",
						onEnter: this.handleExit,
						onEntering: this.handleExiting,
						onEntered: this.handleExited,
					})
				}
			</TransitionGroup.Component>
		);
	}
}

export interface ReplaceTransitionProps extends TransitionEventProps {
	in: boolean;
	children: React.ReactNode;
}

export default ReplaceTransition;
