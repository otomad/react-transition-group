import React from "react";
import type { ReactElement, ReactNode } from "react";
import { keys } from "ts-transformer-keys";
import { ENTERED, ENTERING, ENTERING_END, EXITING, type TransitionStatus } from "./Transition";
import TransitionGroupContext from "./TransitionGroupContext";

function areChildrenDifferent(oldChildren: ReactNode, newChildren: ReactNode) {
	if (oldChildren === newChildren) return false;
	if (
		React.isValidElement(oldChildren) &&
		React.isValidElement(newChildren) &&
		oldChildren.key != null &&
		oldChildren.key === newChildren.key
	) {
		return false;
	}
	return true;
}

/**
 * Enum of modes for SwitchTransition component
 * @enum { string }
 */
export type SwitchTransitionMode = "out-in" | "in-out" | "default" | "out-in-preload";

const callHook =
	(element: ReactElement, name: string, callback: () => void) =>
	(...args: any[]) => {
		element.props[name]?.(...args);
		callback();
	};

const leaveRenders = {
	"out-in": ({ current, changeState }) =>
		React.cloneElement(current, {
			in: false,
			onExited: callHook(current, "onExited", () => {
				changeState(ENTERING, null);
			}),
		}),
	"in-out": ({ current, changeState, children }) => [
		current,
		React.cloneElement(children, {
			in: true,
			onEntered: callHook(children, "onEntered", () => {
				changeState(ENTERING);
			}),
		}),
	],
	default: ({ current, children, changeState }) => [
		React.cloneElement(current, {
			in: false,
		}),
		React.cloneElement(children, {
			in: true,
			onEntered: callHook(children, "onEntered", () => {
				changeState(ENTERED, React.cloneElement(children, { in: true }), true);
			}),
		}),
	],
	"out-in-preload": ({ current, children, changeState }) => [
		React.cloneElement(current, {
			in: false,
			onExited: callHook(current, "onExited", () => {
				changeState(ENTERING);
			}),
		}),
		React.cloneElement(children, {
			in: false,
		}),
	],
} satisfies SwitchTransitionRender;

const enterRenders = {
	"out-in": ({ children, changeState }) =>
		React.cloneElement(children, {
			in: true,
			onEntered: callHook(children, "onEntered", () => {
				changeState(ENTERED, React.cloneElement(children, { in: true }), true);
			}),
		}),
	"in-out": ({ current, children, changeState }) => [
		React.cloneElement(current, {
			in: false,
			onExited: callHook(current, "onExited", () => {
				changeState(ENTERED, React.cloneElement(children, { in: true }), true);
			}),
		}),
		React.cloneElement(children, {
			in: true,
		}),
	],
	default: ({ children }) =>
		React.cloneElement(children, {
			in: true,
		}),
	"out-in-preload": ({ current, children, changeState }) => [
		React.cloneElement(current, {
			in: false,
		}),
		React.cloneElement(children, {
			in: true,
			onEntered: callHook(children, "onEntered", () => {
				changeState(ENTERING_END, React.cloneElement(children, { in: true }));
			}),
		}),
	],
	interrupt: ({ current, children, changeState }) =>
		React.cloneElement(children, {
			in: true,
			onEntered: callHook(children, "onEntered", () => {
				changeState(ENTERED, React.cloneElement(children, { in: true }), true);
			}),
		}),
} satisfies SwitchTransitionRender & {
	interrupt: SwitchTransitionRenderHandler;
};

const enterEndRenders = {
	"out-in-preload": ({ current, changeState }) => {
		setTimeout(() => changeState(ENTERED, undefined, true));
		return current;
	},
} satisfies SwitchTransitionRender;

export const switchTransitionPropKeys = keys<SwitchTransitionProps>();

/**
 * A transition component inspired by the [vue transition modes](https://vuejs.org/v2/guide/transitions.html#Transition-Modes).
 * You can use it when you want to control the render between state transitions.
 * Based on the selected mode and the child's key which is the `Transition` or `CSSTransition` component, the `SwitchTransition` makes a consistent transition between them.
 *
 * If the `out-in` mode is selected, the `SwitchTransition` waits until the old child leaves and then inserts a new child.
 * If the `in-out` mode is selected, the `SwitchTransition` inserts a new child first, waits for the new child to enter and then removes the old child.
 *
 * **Note**: If you want the animation to happen simultaneously
 * (that is, to have the old child removed and a new child inserted **at the same time**),
 * you should use
 * [`TransitionGroup`](https://reactcommunity.org/react-transition-group/transition-group)
 * instead.
 *
 * ```jsx
 * function App() {
 *  const [state, setState] = useState(false);
 *  const helloRef = useRef(null);
 *  const goodbyeRef = useRef(null);
 *  const nodeRef = state ? goodbyeRef : helloRef;
 *  return (
 *    <SwitchTransition>
 *      <CSSTransition
 *        key={state ? "Goodbye, world!" : "Hello, world!"}
 *        nodeRef={nodeRef}
 *        addEndListener={(node, done) => node.addEventListener("transitionend", done, false)}
 *        classNames='fade'
 *      >
 *        <button ref={nodeRef} onClick={() => setState(state => !state)}>
 *          {state ? "Goodbye, world!" : "Hello, world!"}
 *        </button>
 *      </CSSTransition>
 *    </SwitchTransition>
 *  );
 * }
 * ```
 *
 * ```css
 * .fade-enter{
 *    opacity: 0;
 * }
 * .fade-exit{
 *    opacity: 1;
 * }
 * .fade-enter-active{
 *    opacity: 1;
 * }
 * .fade-exit-active{
 *    opacity: 0;
 * }
 * .fade-enter-active,
 * .fade-exit-active{
 *    transition: opacity 500ms;
 * }
 * ```
 */
class SwitchTransition extends React.Component<SwitchTransitionProps, SwitchTransitionStates> {
	static defaultProps: SwitchTransitionProps = {
		mode: "out-in",
	};

	state: SwitchTransitionStates = {
		status: ENTERED,
		current: null,
		isSwitching: "will finish",
		previousChildren: null,
	};

	private appeared = false;

	componentDidMount() {
		this.appeared = true;
	}

	static getDerivedStateFromProps(
		props: SwitchTransitionProps,
		state: SwitchTransitionStates,
	): Partial<SwitchTransitionStates> {
		const childrenChanged = areChildrenDifferent(state.previousChildren, props.children);
		return {
			isSwitching:
				state.isSwitching === "finished" && childrenChanged ? "switching"
				: state.isSwitching === "will finish" ? "finished"
				: state.isSwitching,
			previousChildren: props.children,
			...(() => {
				if (props.children == null) {
					return {
						current: null,
					};
				}

				if ((state.isSwitching === "switching" || state.isSwitching === "interrupt") && childrenChanged) {
					return {
						isSwitching: "interrupt",
						status: ENTERING,
					};
				}

				if (state.status === ENTERING && (props.mode === "in-out" || props.mode === "out-in-preload")) {
					return {
						status: ENTERING,
					};
				}

				if (state.current && areChildrenDifferent(state.current, props.children)) {
					return {
						status: EXITING,
					};
				}

				return {
					current: React.cloneElement(props.children, {
						in: true,
					}),
				};
			})(),
		};
	}

	private changeState = (status: TransitionStatus, current = this.state.current, finished = false) => {
		this.setState({
			status,
			current,
			...(finished && { isSwitching: "will finish" }),
		} as SwitchTransitionStates);
	};

	render() {
		let {
			props: { children, mode },
			state: { status, current, isSwitching },
		} = this;

		const data = {
			children,
			current,
			changeState: this.changeState,
			status,
		} as SwitchTransitionRenderData;
		let component: ReactNode;
		if (isSwitching === "interrupt") {
			component = enterRenders.interrupt(data);
		} else {
			switch (status) {
				case ENTERING:
					component = enterRenders[mode!](data);
					break;
				case EXITING:
					component = leaveRenders[mode!](data);
					break;
				case ENTERING_END:
					component = enterEndRenders[mode!](data);
					break;
				case ENTERED:
				default:
					component = current;
					break;
			}
		}

		return (
			<TransitionGroupContext.Provider value={{ isMounting: !this.appeared }}>
				{component}
			</TransitionGroupContext.Provider>
		);
	}
}

type SwitchTransitionRenderData = {
	children: NonNullable<SwitchTransitionProps["children"]>;
	current: NonNullable<SwitchTransitionStates["current"]>;
	changeState: SwitchTransition["changeState"];
	status: SwitchTransitionStates["status"];
};

type SwitchTransitionRenderHandler = (data: SwitchTransitionRenderData) => ReactNode;

type SwitchTransitionRender = Partial<Record<SwitchTransitionMode, SwitchTransitionRenderHandler>>;

interface SwitchTransitionStates {
	status: TransitionStatus;
	current: ReactElement | null;
	isSwitching: "switching" | "interrupt" | "will finish" | "finished";
	previousChildren: ReactElement | null;
}

export interface SwitchTransitionProps {
	/**
	 * Transition modes.
	 * `out-in`: Current element transitions out first, then when complete, the new element transitions in.
	 * `in-out`: New element transitions in first, then when complete, the current element transitions out.
	 * `default`: Current element transitions out and the new element transitions in at the same time.
	 * `out-in-preload`: New element is initially rendered as the real DOM but hidden, and then executed in the same mode as "out-in".
	 *
	 * @default "out-in"
	 * @type {"out-in" | "in-out" | "default" | "out-in-preload"}
	 */
	mode?: SwitchTransitionMode;
	/**
	 * Any `Transition` or `CSSTransition` component.
	 */
	children?: ReactElement;
}

export default SwitchTransition;
