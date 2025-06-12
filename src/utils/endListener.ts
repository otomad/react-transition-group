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
	endListenerProperties?: TransitionProps["transitionEndProperty"],
) {
	const maxTimeouts = getTimeouts(maxTimeout);
	endListenerProperties ||= [];
	if (typeof endListenerProperties === "string") endListenerProperties = [endListenerProperties];
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
			if (endListenerProperties.length && e && !endListenerProperties.includes(e.propertyName)) return;
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
