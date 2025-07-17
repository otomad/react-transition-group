enum TransitionGroupState {
	appear = 0b001,
	enter = 0b010,
	exit = 0b100,

	appearEnter = 0b011,
	enterExit = 0b110,
	appearExit = 0b101,
	all = 0b111,
}

/**
 * The state selector rule generated for the outrageous selector of React Transition Group.
 *
 * Useful in reflow mode.
 *
 * @param states - The state of the transition group, including the bitwise AND value of `appear`, `enter`, and `exit`.
 * Defaults to all three.
 * @param name - Optional transition group animation name, leave blank to indicate not included.
 * @returns The generated state selector.
 *
 * @example
 * ```scss
 * &.enter-from // RAF mode
 * &.enter:not(.enter-active) // reflow mode
 * tgs(tgs.enter) // easier in reflow mode
 * ```
 */
export default function tgs(states: TransitionGroupState = TransitionGroupState.all, name: string = "") {
	if (name) name += "-";
	const selectors: string[] = [];
	if (states & TransitionGroupState.appear) selectors.push(`&.${name}appear:not(.${name}appear-active)`);
	if (states & TransitionGroupState.enter) selectors.push(`&.${name}enter:not(.${name}enter-active)`);
	if (states & TransitionGroupState.exit) selectors.push(`&:is(.${name}exit-active, .${name}exit-done)`);
	return selectors.join(", ");
}

tgs.appear = TransitionGroupState.appear;
tgs.enter = TransitionGroupState.enter;
tgs.exit = TransitionGroupState.exit;
tgs.appearEnter = TransitionGroupState.appearEnter;
tgs.enterExit = TransitionGroupState.enterExit;
tgs.appearExit = TransitionGroupState.appearExit;
tgs.all = TransitionGroupState.all;
