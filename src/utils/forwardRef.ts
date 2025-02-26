import React from "react";

const majorVersionGeq19 = (() => {
	const majorVersion = parseInt(React.version, 10);
	return majorVersion >= 19 || isNaN(majorVersion);
})();

/**
 * @deprecated
 * In React 19, you will get this warning while using `React.forwardRef`.
 *
 * > Accessing element.ref was removed in React 19.
 * > ref is now a regular prop. It will be removed from the JSX Element type in a future release.
 *
 * In order to compatible with React 18 and lower versions, this function for polyfill.
 */
export default function forwardRef<T, P = {}>(
	render: React.ForwardRefRenderFunction<T, React.PropsWithoutRef<P>>,
): React.FC<P & { ref?: React.Ref<T | null> }> {
	if (!majorVersionGeq19) return React.forwardRef(render) as never;
	else return ({ ref, ...props }) => render(props as never, ref!);
}
