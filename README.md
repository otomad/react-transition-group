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

### `addEndListener`

If you do not provide a custom `addEndListener`, it will automatically create an `endListener`. It automatically notifies animation ends at the appropriate time by listening to the `transitionend` event of `nodeRef` element.

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

#### `transitionEndProperty`

**Type:**

<table>
<tbody>
<tr>
<td>

```typescript
string
```
</td>
<td>

```typescript
string[]
```
</td>
<td>

```typescript
{
  enter?: string | string[];
  exit?: string | string[];
  appear?: string | string[];
}
```
</td>
</tr>
</tbody>
</table>

If you do not provide `addEndListener` to you want to use the default `endListener`, and the CSS transition property
of the element sets different transition durations for multiple different CSS properties, by default it will use the
shortest duration of the property, rather than the longest duration, because it cannot predict how many properties of
the element are expected to trigger the transition. Therefore, it is very likely that this will not meet your needs.
Generally, you may need to use the longest duration of the property.

In the `transitionEndProperty` property, you can tell it which property(ies) you want to notify the transition has ended,
while the `transitionend` events of other properties will be ignored. You can provide one (string) or more (string array)
CSS properties (in hyphen case).

It is worth noting that if there are multiple properties change at the same time, only one event will be listened, and it
is uncertain which one is. In addition, the property name in the event may not be the same as the name you set in the
transition property. For example, the property you set is `border`, but you may receive `border-bottom-width`; The property
you set is `inset`, but you may receive `left`. Therefore, be sure to include all possible properties to ensure that
everything is okay.

You can specify a single property for all transition states (appear, enter, exit):

```jsx
transitionEndProperty="height"
```

or multiple properties:

```jsx
transitionEndProperty={["width", "height", "inline-size", "block-size"]}
```

or individually:

```jsx
transitionEndProperty={{
  appear: "inset",
  enter: ["width", "inline-size"],
  exit: ["height", "block-size"],
}}
```

`appear` defaults to the value of `enter` if not specified.

### excludeTransitionEndProperty

**Type:**

<table>
<tbody>
<tr>
<td>

```typescript
string
```
</td>
<td>

```typescript
string[]
```
</td>
<td>

```typescript
{
  enter?: string | string[];
  exit?: string | string[];
  appear?: string | string[];
}
```
</td>
</tr>
</tbody>
</table>

This is contrary to the `transitionEndProperty` property and is used to exclude unwanted transition properties.
The value of the parameter is consistent with the `transitionEndProperty` property.

If you specify two properties at the same time for a same transition state, this property will be ignored,
and `transitionEndProperty` property shall prevail.

#### `requestAnimationFrame`

**Type:** `boolean`

Provide at least one frame of preparation time for the initial value of the transition.

This will cause the transition to trigger slower, but will ensure that the transition works stably.

#### `disabled`

**Type:** `boolean`

Temporarily disable the transition and end the animation immediately.

Useful when the transition is not expected to be performed in certain specific states.

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
