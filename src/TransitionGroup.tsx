import React, { useRef } from "react";
import type { ContextType, ReactElement, ReactNode } from "react";
import TransitionGroupContext from "./TransitionGroupContext";

import {
	getChildMapping,
	getInitialChildMapping,
	getNextChildMapping,
} from "./utils/ChildMapping";
import functionModule from "./utils/functionModule";

class TransitionGroupComponent extends React.Component<
	TransitionGroupProps,
	TransitionGroupState
> {
	private mounted: boolean;

	constructor(
		props: TransitionGroupProps,
		context: ContextType<typeof TransitionGroupContext>,
	) {
		super(props, context);

		const handleExited = this.handleExited.bind(this);

		// Initial children should all be entering, dependent on appear
		this.state = {
			contextValue: { isMounting: true },
			handleExited,
			firstRender: true,
		};
	}

	componentDidMount() {
		this.mounted = true;
		this.setState({
			contextValue: { isMounting: false },
		});
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	static getDerivedStateFromProps(
		nextProps: TransitionGroupProps,
		{
			children: prevChildMapping,
			handleExited,
			firstRender,
		}: TransitionGroupState,
	) {
		return {
			children:
				firstRender ?
					getInitialChildMapping(nextProps, handleExited)
				:	getNextChildMapping(nextProps, prevChildMapping, handleExited),
			firstRender: false,
		};
	}

	static defaultProps: Partial<TransitionGroupProps> = {
		component: "div",
		childFactory: (child) => child,
	};

	// node is `undefined` when user provided `nodeRef` prop
	handleExited(child: ReactElement, node: HTMLElement) {
		let currentChildMapping = getChildMapping(
			this.props.children as ReactElement,
		);

		if (child.key in currentChildMapping) return;

		if (child.props.onExited) {
			child.props.onExited(node);
		}

		if (this.mounted) {
			this.setState((state) => {
				let children = { ...state.children };

				delete children[child.key];
				return { children };
			});
		}
	}

	render() {
		const {
			component: Component,
			childFactory,
			innerRef,
			...props
		} = this.props;
		const { contextValue } = this.state;
		const children = Object.values(this.state.children).map(childFactory);

		delete props.appear;
		delete props.enter;
		delete props.exit;

		if (Component === null) {
			return (
				<TransitionGroupContext.Provider value={contextValue}>
					{children}
				</TransitionGroupContext.Provider>
			);
		}
		return (
			<TransitionGroupContext.Provider value={contextValue}>
				{/* @ts-ignore */}
				<Component ref={innerRef} {...props}>
					{children}
				</Component>
			</TransitionGroupContext.Provider>
		);
	}
}

interface TransitionGroupState {
	contextValue: ContextType<typeof TransitionGroupContext>;
	handleExited: TransitionGroupComponent["handleExited"];
	firstRender: boolean;
	children?: ReactElement;
}

export interface TransitionGroupProps {
	/**
	 * `<TransitionGroup>` renders a `<div>` by default. You can change this
	 * behavior by providing a `component` prop.
	 * If you use React v16+ and would like to avoid a wrapping `<div>` element
	 * you can pass in `component={null}`. This is useful if the wrapping div
	 * borks your css styles.
	 */
	component?: keyof JSX.IntrinsicElements | null | undefined;
	/**
	 * A set of `<Transition>` components, that are toggled `in` and out as they
	 * leave. the `<TransitionGroup>` will inject specific transition props, so
	 * remember to spread them through if you are wrapping the `<Transition>` as
	 * with our `<Fade>` example.
	 *
	 * While this component is meant for multiple `Transition` or `CSSTransition`
	 * children, sometimes you may want to have a single transition child with
	 * content that you want to be transitioned out and in when you change it
	 * (e.g. routes, images etc.) In that case you can change the `key` prop of
	 * the transition child as you change its content, this will cause
	 * `TransitionGroup` to transition the child out and back in.
	 */
	children?: ReactNode;

	/**
	 * A convenience prop that enables or disables appear animations
	 * for all children. Note that specifying this will override any defaults set
	 * on individual children Transitions.
	 */
	appear?: boolean;
	/**
	 * A convenience prop that enables or disables enter animations
	 * for all children. Note that specifying this will override any defaults set
	 * on individual children Transitions.
	 */
	enter?: boolean;
	/**
	 * A convenience prop that enables or disables exit animations
	 * for all children. Note that specifying this will override any defaults set
	 * on individual children Transitions.
	 */
	exit?: boolean;

	/**
	 * You may need to apply reactive updates to a child as it is exiting.
	 * This is generally done by using `cloneElement` however in the case of an exiting
	 * child the element has already been removed and not accessible to the consumer.
	 *
	 * If you do need to update a child as it leaves you can provide a `childFactory`
	 * to wrap every child, even the ones that are leaving.
	 *
	 * @type Function(child: ReactElement) -> ReactElement
	 * @param child - the exiting child element
	 * @returns the updated child element
	 */
	childFactory?: (child: ReactElement) => ReactElement;

	/**
	 * A ref that can be attached to the outer element of the TransitionGroup.
	 */
	innerRef?: React.LegacyRef<HTMLElement | null>;
}

/**
 * The `<TransitionGroup>` component manages a set of transition components
 * (`<Transition>` and `<CSSTransition>`) in a list. Like with the transition
 * components, `<TransitionGroup>` is a state machine for managing the mounting
 * and unmounting of components over time.
 *
 * Consider the example below. As items are removed or added to the TodoList the
 * `in` prop is toggled automatically by the `<TransitionGroup>`.
 *
 * Note that `<TransitionGroup>`  does not define any animation behavior!
 * Exactly _how_ a list item animates is up to the individual transition
 * component. This means you can mix and match animations across different list
 * items.
 */
const TransitionGroup = functionModule(
	React.forwardRef<HTMLElement, Omit<TransitionGroupProps, "innerRef">>(
		function TransitionGroup(props, ref) {
			return <TransitionGroupComponent innerRef={ref} {...props} />;
		},
	),
	{
		Component: TransitionGroupComponent,
	},
);

export default TransitionGroup;
