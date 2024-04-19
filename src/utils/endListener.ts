/**
 * Used to obtain when the element animation ends, to help automatically obtain the animation time.
 *
 * @returns A function that can be used to remove the event listener when it's no longer needed.
 */
export default function endListener() {
	/**
	 * @param node The HTMLElement to listen for the "transitionend" event.
	 * @param done A callback function to be executed when the animation ends.
	 */
	return (node: HTMLElement, done: () => void) => {
		const listener = (e: TransitionEvent) => {
			if (e.target !== e.currentTarget) return;
			node?.removeEventListener("transitionend", listener, false);
			done();
		};
		node?.addEventListener("transitionend", listener, false);
	};
}
