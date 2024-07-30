/**
 * Did the user request to reduce the dynamic effect?
 * @returns User requested to reduce dynamic effects.
 */
export const isPrefersReducedMotion = () =>
	window.matchMedia("(prefers-reduced-motion: reduce)").matches;
