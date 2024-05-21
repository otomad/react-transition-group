/**
 * Wait for the next animation frame to update refresh.
 * @returns Empty promise.
 */
export default function requestAnimationFrame() {
	return new Promise<void>((resolve) => {
		window.requestAnimationFrame(() => {
			window.requestAnimationFrame(() => {
				resolve();
			});
		});
	});
}
