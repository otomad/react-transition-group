/**
 * Did the user request to reduce the dynamic effect?
 * @returns User requested to reduce dynamic effects.
 */
const isPrefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default isPrefersReducedMotion;
