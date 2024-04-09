import React, { useRef } from "react";

import Transition from "./Transition";
import type { EnterHandler, ExitHandler, TransitionProps } from "./Transition";
import { forceReflow } from "./utils/reflow";
import functionModule from "./utils/functionModule";
import { cloneRef, endListener } from "./utils/cloneRef";

const preprocessClasses = (classes: string | string[]) =>
	(typeof classes === "string" ? [classes] : classes).flatMap(classes => classes.split(" "));
const addClass = (node: Element, classes: string | string[]) =>
	classes && node?.classList.add(...preprocessClasses(classes));
const removeClass = (node: Element, classes: string | string[]) =>
	classes && node?.classList.remove(...preprocessClasses(classes));

class CSSTransitionComponent extends React.Component<CSSTransitionProps> {
	static defaultProps = {
		classNames: "",
	};

	private appliedClasses: AppliedClasses = {
		appear: {},
		enter: {},
		exit: {},
	};

	private onEnter: EnterHandler = (node, appearing) => {
		const type = appearing ? "appear" : "enter";
		this.removeClasses(node, "exit");
		this.addClass(node, type, "base");
		this.addClass(node, type, "from");

		if (this.props.onEnter) {
			this.props.onEnter(node, appearing);
		}
	};

	private onEntering: EnterHandler = (node, appearing) => {
		const type = appearing ? "appear" : "enter";
		this.addClass(node, type, "active");
		this.removeClasses(node, type, "from");

		if (this.props.onEntering) {
			this.props.onEntering(node, appearing);
		}
	};

	private onEntered: EnterHandler = (node, appearing) => {
		const type = appearing ? "appear" : "enter";
		this.removeClasses(node, type);
		this.addClass(node, type, "done");

		if (this.props.onEntered) {
			this.props.onEntered(node, appearing);
		}
	};

	private onExit: ExitHandler = (node) => {
		this.removeClasses(node, "appear");
		this.removeClasses(node, "enter");
		this.addClass(node, "exit", "base");
		this.addClass(node, "exit", "from");

		if (this.props.onExit) {
			this.props.onExit(node);
		}
	};

	private onExiting: ExitHandler = (node) => {
		this.removeClasses(node, "exit", "from");
		this.addClass(node, "exit", "active");

		if (this.props.onExiting) {
			this.props.onExiting(node);
		}
	};

	private onExited: ExitHandler = (node) => {
		this.removeClasses(node, "exit");
		this.addClass(node, "exit", "done");

		if (this.props.onExited) {
			this.props.onExited(node);
		}
	};

	// when prop `nodeRef` is provided `node` is excluded
	// private resolveArguments = (maybeNode, maybeAppearing) =>
	// 	this.props.nodeRef
	// 		? [this.props.nodeRef.current, maybeNode] // here `maybeNode` is actually `appearing`
	// 		: [maybeNode, maybeAppearing]; // `findDOMNode` was used

	private getClassNames = (type: AppliedClassType) => {
		const { classNames } = this.props;
		const isStringClassNames = typeof classNames === "string";
		const prefix = isStringClassNames && classNames ? `${classNames}-` : "";

		let baseClassName = isStringClassNames
			? `${prefix}${type}`
			: classNames[type];

		let fromClassName = isStringClassNames
			? `${baseClassName}-from`
			: classNames[`${type}From`];

		let activeClassName = isStringClassNames
			? `${baseClassName}-active`
			: classNames[`${type}Active`];

		let doneClassName = isStringClassNames
			? `${baseClassName}-done`
			: classNames[`${type}Done`];

		return {
			baseClassName,
			fromClassName,
			activeClassName,
			doneClassName,
		};
	};

	private addClass(
		node: HTMLElement,
		type: AppliedClassType,
		phase: AppliedClassPhase,
	) {
		let className = this.getClassNames(type)[`${phase}ClassName`];
		const { doneClassName } = this.getClassNames("enter");

		if (type === "appear" && phase === "done" && doneClassName) {
			className += ` ${doneClassName}`;
		}

		// This is to force a repaint,
		// which is necessary in order to transition styles when adding a class name.
		if (phase === "active") {
			if (node) forceReflow(node);
		}

		if (className) {
			this.appliedClasses[type][phase] = className;
			addClass(node, className);
		}
	}

	private removeClasses(
		node: Element,
		type: AppliedClassType,
		phase?: AppliedClassPhase,
	) {
		const currentType = this.appliedClasses[type];

		const phases = ["base", "from", "active", "done"] as const;
		
		for (const currentPhase of phases) {
			if (currentType[currentPhase] && (!phase || phase === currentPhase)) {
				removeClass(node, currentType[currentPhase]);
				delete currentType[currentPhase];
			}
		}
	}

	render() {
		const { classNames: _, ...props } = this.props;

		return (
			<Transition.Component
				{...props}
				onEnter={this.onEnter}
				onEntered={this.onEntered}
				onEntering={this.onEntering}
				onExit={this.onExit}
				onExiting={this.onExiting}
				onExited={this.onExited}
			/>
		);
	}
}

type AppliedClassType = "appear" | "enter" | "exit";
type AppliedClassPhase = "base" | "from" | "active" | "done";
type AppliedClasses = Record<
	AppliedClassType,
	Partial<Record<AppliedClassPhase, string>>
>;

type CSSTransitionClassName = {
	[type in AppliedClassType as string]: {
		[phase in AppliedClassPhase as string]: `${type}${phase extends "base"
			? ""
			: Capitalize<phase>}`;
	};
}[string][string];
export type CSSTransitionClassNames = Partial<
	Record<CSSTransitionClassName, string>
>;

export interface CSSTransitionProps extends TransitionProps {
	/**
	 * The animation classNames applied to the component as it appears, enters,
	 * exits or has finished the transition. A single name can be provided, which
	 * will be suffixed for each stage, e.g. `classNames="fade"` applies:
	 *
	 * - `fade-appear`, `fade-appear-active`, `fade-appear-done`
	 * - `fade-enter`, `fade-enter-active`, `fade-enter-done`
	 * - `fade-exit`, `fade-exit-active`, `fade-exit-done`
	 *
	 * A few details to note about how these classes are applied:
	 *
	 * 1. They are _joined_ with the ones that are already defined on the child
	 *    component, so if you want to add some base styles, you can use
	 *    `className` without worrying that it will be overridden.
	 *
	 * 2. If the transition component mounts with `in={false}`, no classes are
	 *    applied yet. You might be expecting `*-exit-done`, but if you think
	 *    about it, a component cannot finish exiting if it hasn't entered yet.
	 *
	 * 2. `fade-appear-done` and `fade-enter-done` will _both_ be applied. This
	 *    allows you to define different behavior for when appearing is done and
	 *    when regular entering is done, using selectors like
	 *    `.fade-enter-done:not(.fade-appear-done)`. For example, you could apply
	 *    an epic entrance animation when element first appears in the DOM using
	 *    [Animate.css](https://daneden.github.io/animate.css/). Otherwise you can
	 *    simply use `fade-enter-done` for defining both cases.
	 *
	 * Each individual classNames can also be specified independently like:
	 *
	 * ```js
	 * classNames={{
	 *  appear: 'my-appear',
	 *  appearActive: 'my-active-appear',
	 *  appearDone: 'my-done-appear',
	 *  enter: 'my-enter',
	 *  enterActive: 'my-active-enter',
	 *  enterDone: 'my-done-enter',
	 *  exit: 'my-exit',
	 *  exitActive: 'my-active-exit',
	 *  exitDone: 'my-done-exit',
	 * }}
	 * ```
	 *
	 * If you want to set these classes using CSS Modules:
	 *
	 * ```js
	 * import styles from './styles.css';
	 * ```
	 *
	 * you might want to use camelCase in your CSS file, that way could simply
	 * spread them instead of listing them one by one:
	 *
	 * ```js
	 * classNames={{ ...styles }}
	 * ```
	 *
	 * @type {string | {
	 *  appear?: string,
	 *  appearActive?: string,
	 *  appearDone?: string,
	 *  enter?: string,
	 *  enterActive?: string,
	 *  enterDone?: string,
	 *  exit?: string,
	 *  exitActive?: string,
	 *  exitDone?: string,
	 * }}
	 */
	classNames?: string | CSSTransitionClassNames;

	/**
	 * A `<Transition>` callback fired immediately after the 'enter' or 'appear' class is
	 * applied.
	 *
	 * **Note**: when `nodeRef` prop is passed, `node` is not passed, so `isAppearing` is being passed as the first argument.
	 *
	 * @type Function(node: HtmlElement, isAppearing: bool)
	 */
	onEnter?: EnterHandler;

	/**
	 * A `<Transition>` callback fired immediately after the 'enter-active' or
	 * 'appear-active' class is applied.
	 *
	 * **Note**: when `nodeRef` prop is passed, `node` is not passed, so `isAppearing` is being passed as the first argument.
	 *
	 * @type Function(node: HtmlElement, isAppearing: bool)
	 */
	onEntering?: EnterHandler;

	/**
	 * A `<Transition>` callback fired immediately after the 'enter' or
	 * 'appear' classes are **removed** and the `done` class is added to the DOM node.
	 *
	 * **Note**: when `nodeRef` prop is passed, `node` is not passed, so `isAppearing` is being passed as the first argument.
	 *
	 * @type Function(node: HtmlElement, isAppearing: bool)
	 */
	onEntered?: EnterHandler;

	/**
	 * A `<Transition>` callback fired immediately after the 'exit' class is
	 * applied.
	 *
	 * **Note**: when `nodeRef` prop is passed, `node` is not passed
	 *
	 * @type Function(node: HtmlElement)
	 */
	onExit?: ExitHandler;

	/**
	 * A `<Transition>` callback fired immediately after the 'exit-active' is applied.
	 *
	 * **Note**: when `nodeRef` prop is passed, `node` is not passed
	 *
	 * @type Function(node: HtmlElement)
	 */
	onExiting?: ExitHandler;

	/**
	 * A `<Transition>` callback fired immediately after the 'exit' classes
	 * are **removed** and the `exit-done` class is added to the DOM node.
	 *
	 * **Note**: when `nodeRef` prop is passed, `node` is not passed
	 *
	 * @type Function(node: HtmlElement)
	 */
	onExited?: ExitHandler;
}

/**
 * A transition component inspired by the excellent
 * [ng-animate](https://docs.angularjs.org/api/ngAnimate) library, you should
 * use it if you're using CSS transitions or animations. It's built upon the
 * [`Transition`](https://reactcommunity.org/react-transition-group/transition)
 * component, so it inherits all of its props.
 *
 * `CSSTransition` applies a pair of class names during the `appear`, `enter`,
 * and `exit` states of the transition. The first class is applied and then a
 * second `*-active` class in order to activate the CSS transition. After the
 * transition, matching `*-done` class names are applied to persist the
 * transition state.
 *
 * ```jsx
 * function App() {
 *   const [inProp, setInProp] = useState(false);
 *   const nodeRef = useRef(null);
 *   return (
 *     <div>
 *       <CSSTransition nodeRef={nodeRef} in={inProp} timeout={200} classNames="my-node">
 *         <div ref={nodeRef}>
 *           {"I'll receive my-node-* classes"}
 *         </div>
 *       </CSSTransition>
 *       <button type="button" onClick={() => setInProp(true)}>
 *         Click to Enter
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 *
 * When the `in` prop is set to `true`, the child component will first receive
 * the class `example-enter`, then the `example-enter-active` will be added in
 * the next tick. `CSSTransition` [forces a
 * reflow](https://github.com/reactjs/react-transition-group/blob/5007303e729a74be66a21c3e2205e4916821524b/src/CSSTransition.js#L208-L215)
 * between before adding the `example-enter-active`. This is an important trick
 * because it allows us to transition between `example-enter` and
 * `example-enter-active` even though they were added immediately one after
 * another. Most notably, this is what makes it possible for us to animate
 * _appearance_.
 *
 * ```css
 * .my-node-enter {
 *   opacity: 0;
 * }
 * .my-node-enter-active {
 *   opacity: 1;
 *   transition: opacity 200ms;
 * }
 * .my-node-exit {
 *   opacity: 1;
 * }
 * .my-node-exit-active {
 *   opacity: 0;
 *   transition: opacity 200ms;
 * }
 * ```
 *
 * `*-active` classes represent which styles you want to animate **to**, so it's
 * important to add `transition` declaration only to them, otherwise transitions
 * might not behave as intended! This might not be obvious when the transitions
 * are symmetrical, i.e. when `*-enter-active` is the same as `*-exit`, like in
 * the example above (minus `transition`), but it becomes apparent in more
 * complex transitions.
 *
 * **Note**: If you're using the
 * [`appear`](http://reactcommunity.org/react-transition-group/transition#Transition-prop-appear)
 * prop, make sure to define styles for `.appear-*` classes as well.
 */
const CSSTransition = functionModule(
	React.forwardRef<HTMLElement, CSSTransitionProps>(function CSSTransition(
		props,
		ref,
	) {
		const nodeRef = useRef<HTMLElement | null>(null);

		React.useImperativeHandle(ref, () => nodeRef.current!, []);

		return (
			<CSSTransitionComponent
				{...props}
				{...(props.timeout != null
					? { timeout: props.timeout }
					: { nodeRef, addEndListener: endListener() })}
			>
				{cloneRef(props.children as React.ReactNode, nodeRef)}
			</CSSTransitionComponent>
		);
	}),
	{
		Component: CSSTransitionComponent,
	},
);

export default CSSTransition;
