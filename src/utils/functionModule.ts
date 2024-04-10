export default function functionModule<F extends Function, O>(
	func: F,
	object: O,
) {
	return Object.assign(func, object) as F & Readonly<O>;
}
