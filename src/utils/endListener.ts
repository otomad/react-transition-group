import type { TransitionType } from "../CSSTransition";
import type { TransitionTimeout } from "../Transition";
import requestAnimationFrame from "./requestAnimationFrame";

/**
 * Returns the animation timeout values for a transition.
 *
 * @param timeout - The transition timeout value, which can be a number or an object with individual timeout values.
 * @returns An object with the `exit`, `enter`, and `appear` timeout values.
 */
export function getTimeouts(timeout: TransitionTimeout) {
	let exit: number | undefined,
		enter: number | undefined,
		appear: number | undefined;

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
) {
	const maxTimeouts = getTimeouts(maxTimeout);
	/**
	 * @param node The HTMLElement to listen for the "transitionend" event.
	 * @param done A callback function to be executed when the animation ends.
	 */
	return (node: HTMLElement, done: () => void, status: TransitionType) => {
		const maxTimeout = maxTimeouts[status];
		let maxTimeoutId: NodeJS.Timeout | undefined;
		const listener = async (e?: TransitionEvent) => {
			if (e && e.target !== e.currentTarget) return;
			if (doesRequestAnimationFrame) await requestAnimationFrame();
			clearTimeout(maxTimeout);
			node?.removeEventListener("transitionend", listener, false);
			done();
		};
		node?.addEventListener("transitionend", listener, false);
		if (
			maxTimeout != null &&
			maxTimeout >= 0 &&
			Number.isFinite(maxTimeout)
		) {
			maxTimeoutId = setTimeout(listener, maxTimeout);
		}
	};
}
