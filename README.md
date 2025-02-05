# react-transition-group-fc

[![npm](https://img.shields.io/npm/v/react-transition-group-fc?logo=npm&logoColor=%23CB3837&label=npm&labelColor=white&color=%23CB3837)](https://www.npmjs.org/package/react-transition-group-fc)
[![GitHub](https://img.shields.io/npm/v/react-transition-group-fc?logo=github&label=GitHub&color=%23181717)](https://github.com/otomad/react-transition-group)
[![License: BSD 3-Clause](https://img.shields.io/badge/License-BSD_3--Clause-orange.svg)][license-url]

[license-url]: https://opensource.org/licenses/BSD-3-Clause

A set of components for managing component states (including mounting and unmounting) over time, specifically designed with animation in mind.

This is a fork of [reactjs/react-transition-group](https://github.com/reactjs/react-transition-group), which fixes the issue of *"findDOMNode is deprecated in StrictMode"*, and adds some additional new features. It will be more convenient to use in React functional components.

## Installation

```bash
# npm
npm install react-transition-group-fc

# yarn
yarn add react-transition-group-fc

# pnpm
pnpm add react-transition-group-fc
```

### TypeScript

This is written in TypeScript, so it directly supports types, without the need for additional installation of type dependencies.

Removed prop-types runtime type analysis and fully utilized TypeScript static analysis.

## Documentation

This is compatible with the original [react-transition-group](https://github.com/reactjs/react-transition-group), so the documentation and basic usage sections can be directly referenced from the original version.

- [**Main documentation**](https://reactcommunity.org/react-transition-group/)
- [Migration guide from v1](/Migration.md)

## New Features

Here is a detailed explanation of the additional features added in this fork.

### *findDOMNode is deprecated in StrictMode*

react-transition-group internally uses findDOMNode, which is deprecated and produces warnings in Strict Mode.

A warning regarding the deprecation of findDOMNode is shown when using the SwitchTransition & CSSTransition in Strict mode (React v16.13.1).

> Warning: findDOMNode is deprecated in StrictMode. findDOMNode was passed an instance of Transition which is inside StrictMode. Instead, add a ref directly to the element you want to reference. Learn more about using refs safely here: https://fb.me/react-strict-mode-find-node

This fork uses the `ref` attribute in React functional components to retrieve the DOM elements of child nodes.

According to the official response, you originally needed to manually get the DOM element through `ref` attribute and pass it to the `nodeRef` property of Transition component to correctly support it. But I think it's troublesome to do this every time, so I let it automate this step.

Now all you need to do is make sure your component is wrapped by a forwardRef function (or ref as a prop in React 19 or higher) ─ for basic HTML elements, this step can be skipped ─ and all operations will now be automatically completed.

It will not take over the ownership of your ref, you can still continue to use your ref elsewhere.

If your component does not provide a ref or is a class component, the traditional findDOMNode method will continue to be used to get the DOM element. In addition, you can still pass another DOM element for the `nodeRef` property.

For old class component, you can also use `<Transition.Component>` / `<CssTransition.Component>` to access them.

#### findDOMNode was removed in React 19

> [React 19 Removed APIs](https://react.dev/reference/react-dom#removed-apis)

You cannot rely findDOMNode method to automatically get the child node ref in React 19, especially in legacy React class component. React 18 or lower versions are not affected.

### *(prefers-reduced-motion: reduce)*

If the user requests to reduce the animation, it will end immediately after any animation starts.

### Transition

New component properties and events:

#### `maxTimeout`

**Type**

<table>
<tbody>
<tr>
<td>

```typescript
number
```
</td>
<td>

```typescript
{
  enter?: number;
  exit?: number;
  appear?: number;
}
```
</td>
</tr>
</tbody>
</table>

Specifies the maximum duration to wait for the `transitionend` event when the `timeout` prop is not specified
and the `addEndListener` trigger is not customized. Avoid an issue that when the style transition unexpectedly
exceeds the waiting time, or the transition is not triggered or not detected, the final style layout exception
is caused.

It will work properly in `<Transition>` / `<CssTransition>` function component only, and will not work in
`<Transition.Component>` / `<CssTransition.Component>` class component.

#### `requestAnimationFrame`

**Type:** `boolean`

Provide at least one frame of preparation time for the initial value of the transition.

This will cause the transition to trigger slower, but will ensure that the transition works stably.

#### `onMounted`

**Type**

```typescript
(
  node: HTMLElement,
  status: "appear" | "enter" | "exit",
) => void
```

Callback fired after the component is mounted.

#### `onUpdated`

**Type**

```typescript
(
  node: HTMLElement,
  nextStatus: "entering" | "enteringEnd" | "entered" | "exiting" | "exited" | "unmounted" | null,
  previousStatus: "entering" | "enteringEnd" | "entered" | "exiting" | "exited" | "unmounted",
) => void
```

Callback fired after the component's state has been updated.

**Parameters:**

* **node** - The nodeRef you specified.
* **nextStatus** - The next transition status.
* **previousStatus** - The previous transition status.

#### `onBeforeUnmount`

**Type**

```typescript
(
  node: HTMLElement,
  lastStatus: "entering" | "enteringEnd" | "entered" | "exiting" | "exited" | "unmounted",
) => void
```

Callback fired before the component is unmounted.

**Parameters:**

* **node** - The nodeRef you specified.
* **lastStatus** - The last transition status.

### CSSTransition

New component properties:

#### `moreCoherentWhenCombo`

**Type:** `boolean`

When user quickly toggle transition, it will skip the `appear-from`, `enter-from` and `exit-from` style.

#### `hiddenOnExit`

**Type:** `boolean`

Set `hiddenOnExit` if you'd prefer to hide the component after it finishes exiting.
(Something like to add `[hidden]` or `display: none`.)

### SwitchTransition

New switch transition modes (bold for newly added):

`out-in`, `in-out`, **`default`, `out-in-preload`**

#### `default`

The current element transitions out and the new element transitions in at the same time.

Although it named "default", the default value of the property is still "out-in" for compatibility purposes. In fact, "out-in" is also more commonly used.

It is named "default" just to be consistent with Vue transition modes.

#### `out-in-preload`

The new element is initially rendered as the real DOM but hidden, and then executed in the same mode as "out-in".

This is because when executing the "out-in" mode, the new element will be loaded as soon as the current element is unloaded. If there are too many nodes and descendants of the element, it will suddenly lag during the animation process, affecting the experience.

Therefore, we let the new element be loaded at the beginning but not displayed, so that the lag will be advanced before the animation plays, thus not interrupting the normal playback of the animation.

Note: This can cause the content in the new element to actually be preloaded but not rendered, so you may need to adjust some of the code, such as increasing the delay of CSS animation properties in the child elements, to avoid the animation playing prematurely before the element is officially displayed.

## License

react-transition-group-fc is available under the [BSD 3-Clause License][license-url]. See the LICENSE file for more info.
