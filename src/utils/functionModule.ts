/**
 * @deprecated Await for React 19 released with a new feature **ref as a prop**, and then delete this function.
 */
export default function functionModule<F extends Function, O>(func: F, object: O) {
	return Object.assign(func, object) as F & Readonly<O>;
}
