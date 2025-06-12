import type { TransitionType } from "../CSSTransition";
import type { TransitionProps, TransitionTimeout } from "../Transition";
import isPrefersReducedMotion from "./isPrefersReducedMotion";
import requestAnimationFrame from "./requestAnimationFrame";

/**
 * Returns the animation timeout values for a transition.
 *
 * @param timeout - The transition timeout value, which can be a number or an object with individual timeout values.
 * @returns An object with the `exit`, `enter`, and `appear` timeout values.
 */
export function getTimeouts(timeout: TransitionTimeout) {
	let exit: number | undefined, enter: number | undefined, appear: number | undefined;

	exit = enter = appear = timeout as number;

	if (timeout != null && typeof timeout !== "number") {
		exit = timeout.exit;
		enter = timeout.enter;
		// TODO: remove fallback for next major
		appear = timeout.appear !== undefined ? timeout.appear : enter;
	}
	return { exit, enter, appear };
}

/**
 * Used to obtain when the element animation ends, to help automatically obtain the animation time.
 *
 * @param maxTimeout - Specifies the maximum duration to wait for the `transitionend` event.
 * @returns A function that can be used to remove the event listener when it's no longer needed.
 */
export default function endListener(
	maxTimeout: TransitionTimeout,
	doesRequestAnimationFrame?: boolean,
	endListenerProperties: EndListenerProperties = {},
) {
	const maxTimeouts = getTimeouts(maxTimeout);
	processEndListenerProperties(endListenerProperties);
	/**
	 * @param node The HTMLElement to listen for the "transitionend" event.
	 * @param done A callback function to be executed when the animation ends.
	 */
	return (node: HTMLElement, done: () => void, status: TransitionType) => {
		if (isPrefersReducedMotion()) return done();
		const maxTimeout = maxTimeouts[status];
		let maxTimeoutId: NodeJS.Timeout | undefined;
		const listener = async (e?: TransitionEvent) => {
			if (e && e.target !== e.currentTarget) return;
			if (
				(endListenerProperties.include[status].length &&
					e &&
					!endListenerProperties.include[status].includes(e.propertyName)) ||
				(endListenerProperties.exclude[status].length &&
					e &&
					endListenerProperties.exclude[status].includes(e.propertyName))
			)
				return;
			if (doesRequestAnimationFrame) await requestAnimationFrame();
			clearTimeout(maxTimeout);
			node?.removeEventListener("transitionend", listener, false);
			done();
		};
		node?.addEventListener("transitionend", listener, false);
		if (maxTimeout != null && maxTimeout >= 0 && Number.isFinite(maxTimeout)) {
			maxTimeoutId = setTimeout(listener, maxTimeout);
		}
	};
}

type EndListenerProperties = {
	include?: TransitionProps["transitionEndProperty"];
	exclude?: TransitionProps["transitionEndProperty"];
};
type NormalizedEndListenerProperties = {
	[filter in keyof EndListenerProperties]-?: {
		[state in keyof NotStringOrArray<EndListenerProperties[filter]>]-?: NotString<
			NotStringOrArray<EndListenerProperties[filter]>[state]
		>;
	};
};
type NotStringOrArray<N, T = NonNullable<N>> =
	T extends string ? never
	: T extends any[] ? never
	: T;
type NotString<N, T = NonNullable<N>> = T extends string ? never : T;

function processEndListenerProperties(opt: EndListenerProperties): asserts opt is NormalizedEndListenerProperties {
	const states = ["enter", "exit", "appear"] as const;
	for (const filter of ["include", "exclude"] as const) {
		opt[filter] ||= [];
		if (typeof opt[filter] === "string") opt[filter] = [opt[filter]];
		if (Array.isArray(opt[filter])) {
			const same = opt[filter];
			opt[filter] = {};
			for (const state of states) opt[filter][state] = same;
		}
		for (const state of states) {
			opt[filter][state] ||= state === "appear" ? opt[filter].enter : [];
			if (typeof opt[filter][state] === "string") opt[filter][state] = [opt[filter][state]];
		}
	}
}
