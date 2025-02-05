import ReactDOM from "react-dom";
import type { ReactInstance } from "react";

export const canFindDOMNode = () => "findDOMNode" in ReactDOM;

/**
 * @deprecated `ReactDOM.findDOMNode` was removed since React 19. If you are using React 18 or lower versions,
 * it will invoke `ReactDOM.findDOMNode`, otherwise return null directly, to prevent
 * `import_react_dom.default.findDOMNode is not a function` error at runtime in React 19.
 */
export default function findDOMNode(instance: ReactInstance | null | undefined): Element | null | Text {
	if ("findDOMNode" in ReactDOM)
		return ReactDOM.findDOMNode(instance);
	else
		return null;
}
