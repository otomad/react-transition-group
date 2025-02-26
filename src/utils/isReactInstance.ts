import React from "react";
import type { JSXElementConstructor, ReactElement, ReactNode } from "react";
import Transition from "../Transition";

/**
 * Get React element instance for the React component.
 * @template TComponent - React functional component.
 */
export type ReactElementOf<
	TComponent extends string | JSXElementConstructor<any>,
> = ReactElement<
	TComponent extends React.FC<infer TProps> ? TProps : unknown,
	TComponent
>;

type ReactElementType = string | React.JSXElementConstructor<any>;

export function isObject(value: unknown): value is object {
	return value !== null && typeof value === "object";
}

/**
 * Determine whether a component is an instance of a certain component type.
 * @param node - Component instance.
 * @param element - Component class or function component.
 * @returns Is its instance?
 */
export function isReactInstance<T extends ReactElementType>(
	node: ReactNode,
	element: T,
): node is ReactElementOf<T> {
	return (
		React.isValidElement(node) &&
		isObject(node) &&
		"type" in node &&
		node.type === element
	);
}

export function isTransitionInstance(node: ReactNode): boolean {
	return (
		isReactInstance(node, Transition) ||
		isReactInstance(node, Transition.Component)
	);
}
