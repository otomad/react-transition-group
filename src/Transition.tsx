import React, { useRef } from "react";
import type { ContextType, ReactNode } from "react";
import { flushSync } from "react-dom";
import type * as CSSType from "csstype";
import { keys } from "ts-transformer-keys";

import config from "./config";
import TransitionGroupContext from "./TransitionGroupContext";
import { forceReflow } from "./utils/reflow";
import { getTimeouts } from "./utils/endListener";
import functionModule from "./utils/functionModule";
import type { TransitionType } from "./CSSTransition";
import requestAnimationFrame from "./utils/requestAnimationFrame";
import findDOMNode from "./utils/findDOMNode";
import forwardPropsToComponent from "./utils/forwardPropsToComponent";
import forwardRef from "./utils/forwardRef";
import isPrefersReducedMotion from "./utils/isPrefersReducedMotion";
import { omit } from "./utils/pick-omit";

export const UNMOUNTED = "unmounted";
export const EXITED = "exited";
export const ENTERING = "entering";
export const ENTERING_END = "enteringEnd";
export const ENTERED = "entered";
export const EXITING = "exiting";

export const transitionPropKeys = keys<TransitionProps>();

class TransitionComponent extends React.Component<TransitionProps, TransitionStates> {
	static contextType = TransitionGroupContext;

	private appearStatus: TransitionStatus | null;

	private nextCallback: {
		(event: any): void;
		cancel: () => void;
	} | null = null;

	constructor(props: TransitionProps, context: ContextType<typeof TransitionGroupContext>) {
		super(props, context);

		let parentGroup = context;
		// In the context of a TransitionGroup all enters are really appears
		let appear = parentGroup && !parentGroup.isMounting ? props.enter : props.appear;

		let initialStatus: TransitionStatus;

		this.appearStatus = null;

		if (props.in) {
			if (appear) {
				initialStatus = EXITED;
				this.appearStatus = ENTERING;
			} else {
				initialStatus = ENTERED;
			}
		} else {
			if (props.unmountOnExit || props.mountOnEnter) {
				initialStatus = UNMOUNTED;
			} else {
				initialStatus = EXITED;
			}
		}

		this.state = { status: initialStatus };
	}

	static getDerivedStateFromProps({ in: nextIn }: TransitionProps, prevState: TransitionStates) {
		if (nextIn && prevState.status === UNMOUNTED) {
			return { status: EXITED };
		}
		return null;
	}

	// getSnapshotBeforeUpdate(prevProps: TransitionProps) {
	// 	let nextStatus = null;

	// 	if (prevProps !== this.props) {
	// 		const { status } = this.state;

	// 		if (this.props.in) {
	// 			if (status !== ENTERING && status !== ENTERED) {
	// 				nextStatus = ENTERING;
	// 			}
	// 		} else {
	// 			if (status === ENTERING || status === ENTERED) {
	// 				nextStatus = EXITING;
	// 			}
	// 		}
	// 	}

	// 	return { nextStatus };
	// }

	componentDidMount() {
		const node = this.node;
		const status =
			this.props.in ?
				this.props.appear ?
					"appear"
				:	"enter"
			:	"exit";
		this.props.onMounted?.(node, status);
		this.updateStatus(true, this.appearStatus);
	}

	componentDidUpdate(prevProps: TransitionProps) {
		let nextStatus: TransitionStatus | null = null;
		if (prevProps !== this.props) {
			const { status } = this.state;

			if (this.props.in) {
				if (status !== ENTERING && status !== ENTERED) {
					nextStatus = ENTERING;
				}
			} else {
				if (status === ENTERING || status === ENTERED) {
					nextStatus = EXITING;
				}
			}
		}
		this.updateStatus(false, nextStatus);
	}

	componentWillUnmount() {
		this.cancelNextCallback();
		this.props.onBeforeUnmount?.(this.node, this.state.status);
	}

	private get timeouts() {
		let { timeout, disableTransition: disabled } = this.props;
		if (config.disabled || disabled) timeout = 0;
		return getTimeouts(timeout);
	}

	private get node() {
		return this.props.nodeRef ? this.props.nodeRef.current! : (findDOMNode(this) as HTMLElement)!;
	}

	private updateStatus(mounting = false, nextStatus: TransitionStatus | null) {
		if (nextStatus !== null) {
			// nextStatus will always be ENTERING or EXITING.
			this.cancelNextCallback();

			if (nextStatus === ENTERING) {
				if (this.props.unmountOnExit || this.props.mountOnEnter) {
					const node = this.node;
					// https://github.com/reactjs/react-transition-group/pull/749
					// With unmountOnExit or mountOnEnter, the enter animation should happen at the transition between `exited` and `entering`.
					// To make the animation happen, we have to separate each rendering and avoid being processed as batched.
					if (node && !this.props.requestAnimationFrame) forceReflow(node);
				}
				this.performEnter(mounting);
			} else {
				this.performExit();
			}
		} else if (this.props.unmountOnExit && this.state.status === EXITED) {
			this.setState({ status: UNMOUNTED });
			this.onUpdated(this.node, "unmounted");
		}
	}

	private async performEnter(mounting: boolean) {
		const { enter } = this.props;
		const context = this.context as ContextType<typeof TransitionGroupContext>;
		const appearing = context ? context.isMounting : mounting;
		const node = this.node;

		const timeouts = this.timeouts;
		const enterTimeout = appearing ? timeouts.appear : timeouts.enter;
		// no enter animation skip right to ENTERED
		// if we are mounting and running this it means appear _must_ be set
		if ((!mounting && !enter) || config.disabled || this.props.disableTransition) {
			this.safeSetState({ status: ENTERED }, () => {
				this.props.onEntered?.(node, appearing);
				this.onUpdated(node, appearing ? "appeared" : "entered");
			});
			return;
		}

		this.props.onEnter?.(node, appearing);
		this.onUpdated(node, appearing ? "appear" : "enter");
		if (this.props.requestAnimationFrame) await requestAnimationFrame();

		this.safeSetState({ status: ENTERING }, () => {
			this.props.onEntering?.(node, appearing);
			this.onUpdated(node, appearing ? "appearing" : "entering");

			this.onTransitionEnd(
				enterTimeout,
				() => {
					this.safeSetState({ status: ENTERED }, () => {
						this.props.onEntered?.(node, appearing);
						this.onUpdated(node, appearing ? "appeared" : "entered");
					});
				},
				appearing ? "appear" : "enter",
			);
		});
	}

	private async performExit() {
		const { exit } = this.props;
		const timeouts = this.timeouts;
		const node = this.node;

		// no exit animation skip right to EXITED
		if (!exit || config.disabled || this.props.disableTransition) {
			this.safeSetState({ status: EXITED }, () => {
				this.props.onExited?.(node);
				this.onUpdated(node, "exited");
			});
			return;
		}

		this.props.onExit?.(node);
		this.onUpdated(node, "exit");
		if (this.props.requestAnimationFrame) await requestAnimationFrame();

		this.safeSetState({ status: EXITING }, () => {
			this.props.onExiting?.(node);
			this.onUpdated(node, "exiting");

			const onExited = () => {
				this.safeSetState({ status: EXITED }, () => {
					this.props.onExited?.(node);
					this.onUpdated(node, "exited");
				});
			};

			this.onTransitionEnd(
				timeouts.exit,
				() => {
					// When prefering reduced motion, React will get the following error:
					// > flushSync was called from inside a lifecycle method. React cannot flush when React is already rendering.
					// > Consider moving this call to a scheduler task or micro task.
					if (!isPrefersReducedMotion()) flushSync(onExited);
					else onExited();
				},
				"exit",
			);
		});
	}

	private previousStatus: TransitionUpdateStatus = "unmounted";
	private onUpdated(node: HTMLElement, nextStatus: TransitionUpdateStatus) {
		this.props.onUpdated?.(node, nextStatus, this.previousStatus);
		this.previousStatus = nextStatus;
	}

	private cancelNextCallback() {
		if (this.nextCallback !== null) {
			this.nextCallback.cancel();
			this.nextCallback = null;
		}
	}

	private safeSetState(nextState: TransitionStates, callback) {
		// This shouldn't be necessary, but there are weird race conditions with
		// setState callbacks and unmounting in testing, so always make sure that
		// we can cancel any pending setState callbacks after we unmount.
		callback = this.setNextCallback(callback);
		this.setState(nextState, callback);
	}

	private setNextCallback(callback: (event: any) => void) {
		let active = true;

		const nextCallback = (event: any) => {
			if (active) {
				active = false;
				this.nextCallback = null;

				callback(event);
			}
		};

		nextCallback.cancel = () => {
			active = false;
		};

		return (this.nextCallback = nextCallback);
	}

	private onTransitionEnd(timeout: number | undefined, handler: () => void, status: TransitionType) {
		this.setNextCallback(handler);
		const node = this.node;

		const doesNotHaveTimeoutOrListener = timeout == null && !this.props.addEndListener;
		if (!node || doesNotHaveTimeoutOrListener) {
			setTimeout(this.nextCallback!, 0);
			return;
		}

		this.props.addEndListener?.(node, this.nextCallback as unknown as () => void, status);

		if (timeout != null) {
			setTimeout(this.nextCallback!, timeout);
		}
	}

	render() {
		const status = this.state.status;

		if (status === UNMOUNTED) {
			return null;
		}

		// filter props for `Transition`
		const childProps = omit(this.props, transitionPropKeys),
			{ children } = this.props;

		return (
			// allows for nested Transitions
			<TransitionGroupContext.Provider value={null!}>
				{typeof children === "function" ?
					children(status, childProps)
				:	React.cloneElement(React.Children.only(children as React.ReactElement), childProps)}
			</TransitionGroupContext.Provider>
		);
	}

	static defaultProps = {
		in: false,
		mountOnEnter: false,
		unmountOnExit: false,
		appear: false,
		enter: true,
		exit: true,
		timeout: null,

		onEnter: noop,
		onEntering: noop,
		onEntered: noop,

		onExit: noop,
		onExiting: noop,
		onExited: noop,
	};

	static UNMOUNTED = UNMOUNTED;
	static EXITED = EXITED;
	static ENTERING = ENTERING;
	static ENTERED = ENTERED;
	static EXITING = EXITING;
}

export type TransitionStatus =
	| typeof ENTERING
	| typeof ENTERING_END
	| typeof ENTERED
	| typeof EXITING
	| typeof EXITED
	| typeof UNMOUNTED;

export type TransitionUpdateStatus =
	| "appear"
	| "appearing"
	| "appeared"
	| "enter"
	| "entering"
	| "entered"
	| "exit"
	| "exiting"
	| "exited"
	| "unmounted";

export type TransitionChildren =
	| ReactNode
	| ((status: TransitionStatus, childProps?: Record<string, unknown>) => ReactNode);

export type EndHandler = (node: HTMLElement, done: () => void, status: TransitionType) => void;

export type EnterHandler = (node: HTMLElement, isAppearing?: boolean) => void;

export type ExitHandler = (node: HTMLElement) => void;

export type TransitionTimeout = number | { appear?: number; enter?: number; exit?: number } | undefined;

type TransitionEndPropertyInOneStatus = CSSPropertyHyphenName[] | CSSPropertyHyphenName;
export type TransitionEndProperty =
	| TransitionEndPropertyInOneStatus
	| {
			appear?: TransitionEndPropertyInOneStatus;
			enter?: TransitionEndPropertyInOneStatus;
			exit?: TransitionEndPropertyInOneStatus;
	  };

interface TransitionStates {
	status: TransitionStatus;
}

type CSSPropertyHyphenName = keyof CSSType.PropertiesHyphen | (string & {});

export interface TransitionProps {
	/**
	 * A React reference to the DOM element that needs to transition:
	 * https://stackoverflow.com/a/51127130/4671932
	 *
	 *   - This prop is optional, but recommended in order to avoid defaulting to
	 *      [`ReactDOM.findDOMNode`](https://reactjs.org/docs/react-dom.html#finddomnode),
	 *      which is deprecated in `StrictMode`
	 *   - When `nodeRef` prop is used, `node` is not passed to callback functions
	 *      (e.g. `onEnter`) because user already has direct access to the node.
	 *   - When changing `key` prop of `Transition` in a `TransitionGroup` a new
	 *     `nodeRef` need to be provided to `Transition` with changed `key` prop
	 *     (see
	 *     [test/CSSTransition-test.js](https://github.com/reactjs/react-transition-group/blob/13435f897b3ab71f6e19d724f145596f5910581c/test/CSSTransition-test.js#L362-L437)).
	 */
	nodeRef?: React.RefObject<HTMLElement | null | undefined>;

	/**
	 * A `function` child can be used instead of a React element. This function is
	 * called with the current transition status (`'entering'`, `'entered'`,
	 * `'exiting'`, `'exited'`), which can be used to apply context
	 * specific props to a component.
	 *
	 * ```jsx
	 * <Transition nodeRef={nodeRef} in={this.state.in} timeout={150}>
	 *   {state => (
	 *     <MyComponent ref={nodeRef} className={`fade fade-${state}`} />
	 *   )}
	 * </Transition>
	 * ```
	 */
	children?: TransitionChildren;

	/**
	 * Show the component; triggers the enter or exit states
	 */
	in?: boolean;

	/**
	 * By default the child component is mounted immediately along with
	 * the parent `Transition` component. If you want to "lazy mount" the component on the
	 * first `in={true}` you can set `mountOnEnter`. After the first enter transition the component will stay
	 * mounted, even on "exited", unless you also specify `unmountOnExit`.
	 */
	mountOnEnter?: boolean;

	/**
	 * By default the child component stays mounted after it reaches the `'exited'` state.
	 * Set `unmountOnExit` if you'd prefer to unmount the component after it finishes exiting.
	 */
	unmountOnExit?: boolean;

	/**
	 * By default the child component does not perform the enter transition when
	 * it first mounts, regardless of the value of `in`. If you want this
	 * behavior, set both `appear` and `in` to `true`.
	 *
	 * > **Note**: there are no special appear states like `appearing`/`appeared`, this prop
	 * > only adds an additional enter transition. However, in the
	 * > `<CSSTransition>` component that first enter transition does result in
	 * > additional `.appear-*` classes, that way you can choose to style it
	 * > differently.
	 */
	appear?: boolean;

	/**
	 * Enable or disable enter transitions.
	 */
	enter?: boolean;

	/**
	 * Enable or disable exit transitions.
	 */
	exit?: boolean;

	/**
	 * The duration of the transition, in milliseconds.
	 * Required unless `addEndListener` is provided.
	 *
	 * You may specify a single timeout for all transitions:
	 *
	 * ```jsx
	 * timeout={500}
	 * ```
	 *
	 * or individually:
	 *
	 * ```jsx
	 * timeout={{
	 *   appear: 500,
	 *   enter: 300,
	 *   exit: 500,
	 * }}
	 * ```
	 *
	 * - `appear` defaults to the value of `enter`
	 * - `enter` defaults to `0`
	 * - `exit` defaults to `0`
	 *
	 * @type {number | { appear?: number; enter?: number; exit?: number; }}
	 */
	timeout?: TransitionTimeout;

	/**
	 * Specifies the maximum duration to wait for the `transitionend` event when the `timeout` prop is not specified
	 * and the `addEndListener` trigger is not customized. Avoid an issue that when the style transition unexpectedly
	 * exceeds the waiting time, or the transition is not triggered or not detected, the final style layout exception
	 * is caused.
	 *
	 * It will work properly in `<Transition>` / `<CSSTransition>` function component only, and will not work in
	 * `<Transition.Component>` / `<CSSTransition.Component>` class component.
	 */
	maxTimeout?: TransitionTimeout;

	/**
	 * Use RAF (requestAnimationFrame) instead of reflow to listen for changes from enter/appear-from to enter/appear-active
	 * or from exit-active to exit-done.
	 *
	 * Provide at least one frame of preparation time for the initial value of the transition.
	 *
	 * This will cause the transition to trigger slower, but will ensure that the transition works stably.
	 */
	requestAnimationFrame?: boolean;

	/**
	 * If you do not provide `addEndListener` to you want to use the default `endListener`, and the CSS transition property
	 * of the element sets different transition durations for multiple different CSS properties, by default it will use the
	 * shortest duration of the property, rather than the longest duration, because it cannot predict how many properties of
	 * the element are expected to trigger the transition. Therefore, it is very likely that this will not meet your needs.
	 * Generally, you may need to use the longest duration of the property.
	 *
	 * In the `transitionEndProperty` property, you can tell it which property(ies) you want to notify the transition has ended,
	 * while the `transitionend` events of other properties will be ignored. You can provide one (string) or more (string array)
	 * CSS properties (in hyphen case).
	 *
	 * It is worth noting that if there are multiple properties change at the same time, only one event will be listened, and it
	 * is uncertain which one is. In addition, the property name in the event may not be the same as the name you set in the
	 * transition property. For example, the property you set is `border`, but you may receive `border-bottom-width`; The property
	 * you set is `inset`, but you may receive `left`. Therefore, be sure to include all possible properties to ensure that
	 * everything is okay.
	 *
	 * You can specify a single property for all transition states (appear, enter, exit):
	 *
	 * ```jsx
	 * transitionEndProperty="height"
	 * ```
	 *
	 * or multiple properties:
	 *
	 * ```jsx
	 * transitionEndProperty={["width", "height", "inline-size", "block-size"]}
	 * ```
	 *
	 * or individually:
	 *
	 * ```jsx
	 * transitionEndProperty={{
	 *   appear: "inset",
	 *   enter: ["width", "inline-size"],
	 *   exit: ["height", "block-size"],
	 * }}
	 * ```
	 *
	 * `appear` defaults to the value of `enter` if not specified.
	 */
	transitionEndProperty?: TransitionEndProperty;

	/**
	 * This is contrary to the `transitionEndProperty` property and is used to exclude unwanted transition properties.
	 * The value of the parameter is consistent with the `transitionEndProperty` property.
	 *
	 * If you specify two properties at the same time for a same transition state, this property will be ignored,
	 * and `transitionEndProperty` property shall prevail.
	 */
	excludeTransitionEndProperty?: TransitionEndProperty;

	/**
	 * Temporarily disable the transition and end the animation immediately.
	 *
	 * Useful when the transition is not expected to be performed in certain specific states.
	 */
	disableTransition?: boolean;

	/**
	 * Add a custom transition end trigger. Called with the transitioning
	 * DOM node and a `done` callback. Allows for more fine grained transition end
	 * logic. Timeouts are still used as a fallback if provided.
	 *
	 * **Note**: when `nodeRef` prop is passed, `node` is not passed, so `done` is being passed as the first argument.
	 *
	 * ```jsx
	 * addEndListener={(node, done) => {
	 *   // use the css transitionend event to mark the finish of a transition
	 *   node.addEventListener('transitionend', done, false);
	 * }}
	 * ```
	 *
	 * If you do not provide a custom `addEndListener`, it will automatically create an `endListener`.
	 * It automatically notifies animation ends at the appropriate time by listening to the `transitionend` event of `nodeRef` element.
	 */
	addEndListener?: EndHandler;

	/**
	 * Callback fired before the "entering" status is applied. An extra parameter
	 * `isAppearing` is supplied to indicate if the enter stage is occurring on the initial mount
	 *
	 * **Note**: when `nodeRef` prop is passed, `node` is not passed, so `isAppearing` is being passed as the first argument.
	 *
	 * @type Function(node: HtmlElement, isAppearing: bool) -> void
	 */
	onEnter?: EnterHandler;

	/**
	 * Callback fired after the "entering" status is applied. An extra parameter
	 * `isAppearing` is supplied to indicate if the enter stage is occurring on the initial mount
	 *
	 * **Note**: when `nodeRef` prop is passed, `node` is not passed, so `isAppearing` is being passed as the first argument.
	 *
	 * @type Function(node: HtmlElement, isAppearing: bool)
	 */
	onEntering?: EnterHandler;

	/**
	 * Callback fired after the "entered" status is applied. An extra parameter
	 * `isAppearing` is supplied to indicate if the enter stage is occurring on the initial mount
	 *
	 * **Note**: when `nodeRef` prop is passed, `node` is not passed, so `isAppearing` is being passed as the first argument.
	 *
	 * @type Function(node: HtmlElement, isAppearing: bool) -> void
	 */
	onEntered?: EnterHandler;

	/**
	 * Callback fired before the "exiting" status is applied.
	 *
	 * **Note**: when `nodeRef` prop is passed, `node` is not passed.
	 *
	 * @type Function(node: HtmlElement) -> void
	 */
	onExit?: ExitHandler;

	/**
	 * Callback fired after the "exiting" status is applied.
	 *
	 * **Note**: when `nodeRef` prop is passed, `node` is not passed.
	 *
	 * @type Function(node: HtmlElement) -> void
	 */
	onExiting?: ExitHandler;

	/**
	 * Callback fired after the "exited" status is applied.
	 *
	 * **Note**: when `nodeRef` prop is passed, `node` is not passed
	 *
	 * @type Function(node: HtmlElement) -> void
	 */
	onExited?: ExitHandler;

	/**
	 * Callback fired after the component is mounted.
	 *
	 * @param node - The nodeRef you specified.
	 * @param {"appear" | "enter" | "exit"} status - The component is appear, enter or exit.
	 */
	onMounted?: (node: HTMLElement, status: TransitionType) => void;

	/**
	 * Callback fired after the component's state has been updated.
	 *
	 * @param node - The nodeRef you specified.
	 * @param nextStatus - The next transition status.
	 * @param previousStatus - The previous transition status.
	 */
	onUpdated?: (node: HTMLElement, nextStatus: TransitionUpdateStatus, previousStatus: TransitionUpdateStatus) => void;

	/**
	 * Callback fired before the component is unmounted.
	 *
	 * @param node - The nodeRef you specified.
	 * @param lastStatus - The last transition status.
	 */
	onBeforeUnmount?: (node: HTMLElement, lastStatus: TransitionStatus) => void;
}

type TransitionEventPropKeys = {
	[prop in keyof TransitionProps as string]: prop extends `on${string}` ? prop : never;
}[string];
export type TransitionEventProps = {
	[prop in TransitionEventPropKeys]?: TransitionProps[prop];
};

// Name the function so it is clearer in the documentation
function noop() {}

/**
 * The Transition component lets you describe a transition from one component
 * state to another _over time_ with a simple declarative API. Most commonly
 * it's used to animate the mounting and unmounting of a component, but can also
 * be used to describe in-place transition states as well.
 *
 * ---
 *
 * **Note**: `Transition` is a platform-agnostic base component. If you're using
 * transitions in CSS, you'll probably want to use
 * [`CSSTransition`](https://reactcommunity.org/react-transition-group/css-transition)
 * instead. It inherits all the features of `Transition`, but contains
 * additional features necessary to play nice with CSS transitions (hence the
 * name of the component).
 *
 * ---
 *
 * By default the `Transition` component does not alter the behavior of the
 * component it renders, it only tracks "enter" and "exit" states for the
 * components. It's up to you to give meaning and effect to those states. For
 * example we can add styles to a component when it enters or exits:
 *
 * ```jsx
 * import { Transition } from 'react-transition-group';
 * import { useRef } from 'react';
 *
 * const duration = 300;
 *
 * const defaultStyle = {
 *   transition: `opacity ${duration}ms ease-in-out`,
 *   opacity: 0,
 * }
 *
 * const transitionStyles = {
 *   entering: { opacity: 1 },
 *   entered:  { opacity: 1 },
 *   exiting:  { opacity: 0 },
 *   exited:   { opacity: 0 },
 * };
 *
 * function Fade({ in: inProp }) {
 *   const nodeRef = useRef(null);
 *   return (
 *     <Transition nodeRef={nodeRef} in={inProp} timeout={duration}>
 *       {state => (
 *         <div ref={nodeRef} style={{
 *           ...defaultStyle,
 *           ...transitionStyles[state]
 *         }}>
 *           I'm a fade Transition!
 *         </div>
 *       )}
 *     </Transition>
 *   );
 * }
 * ```
 *
 * There are 4 main states a Transition can be in:
 *  - `'entering'`
 *  - `'entered'`
 *  - `'exiting'`
 *  - `'exited'`
 *
 * Transition state is toggled via the `in` prop. When `true` the component
 * begins the "Enter" stage. During this stage, the component will shift from
 * its current transition state, to `'entering'` for the duration of the
 * transition and then to the `'entered'` stage once it's complete. Let's take
 * the following example (we'll use the
 * [useState](https://reactjs.org/docs/hooks-reference.html#usestate) hook):
 *
 * ```jsx
 * import { Transition } from 'react-transition-group';
 * import { useState, useRef } from 'react';
 *
 * function App() {
 *   const [inProp, setInProp] = useState(false);
 *   const nodeRef = useRef(null);
 *   return (
 *     <div>
 *       <Transition nodeRef={nodeRef} in={inProp} timeout={500}>
 *         {state => (
 *           // ...
 *         )}
 *       </Transition>
 *       <button onClick={() => setInProp(true)}>
 *         Click to Enter
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 *
 * When the button is clicked the component will shift to the `'entering'` state
 * and stay there for 500ms (the value of `timeout`) before it finally switches
 * to `'entered'`.
 *
 * When `in` is `false` the same thing happens except the state moves from
 * `'exiting'` to `'exited'`.
 */
const Transition = functionModule(
	forwardRef<HTMLElement, TransitionProps>(function Transition(props, ref) {
		const nodeRef = useRef<HTMLElement | null>(null);

		React.useImperativeHandle(ref, () => nodeRef.current!, []);

		return <TransitionComponent {...forwardPropsToComponent(props, nodeRef)} />;
	}),
	{
		Component: TransitionComponent,
	},
);

export default Transition;
