import nodeResolve from "rollup-plugin-node-resolve";
import babel from "rollup-plugin-babel";
import commonjs from "rollup-plugin-commonjs";
import replace from "rollup-plugin-replace";
// import { sizeSnapshot } from "rollup-plugin-size-snapshot";
import { terser } from "rollup-plugin-terser";
import typescript from "@rollup/plugin-typescript";

const input = "./src/index.ts";
const name = "ReactTransitionGroup";
const globals = {
	react: "React",
	"react-dom": "ReactDOM",
};

const babelOptions = {
	exclude: /node_modules/,
	runtimeHelpers: true,
};

const commonjsOptions = {
	include: /node_modules/,
	namedExports: {
		"prop-types": ["object", "oneOfType", "element", "bool", "func"],
	},
};

export default [
	{
		input,
		output: {
			file: "./lib/dist/react-transition-group.js",
			format: "esm",
			name,
			globals,
		},
		external: Object.keys(globals),
		plugins: [
			nodeResolve(),
			typescript(),
			babel(babelOptions),
			commonjs(commonjsOptions),
			replace({ "process.env.NODE_ENV": JSON.stringify("development") }),
			// sizeSnapshot(),
		],
	},

	/* {
		input,
		output: {
			file: "./lib/dist/react-transition-group.min.js",
			format: "es",
			name,
			globals,
		},
		external: Object.keys(globals),
		plugins: [
			nodeResolve(),
			typescript(),
			babel(babelOptions),
			commonjs(commonjsOptions),
			replace({ "process.env.NODE_ENV": JSON.stringify("production") }),
			// sizeSnapshot(),
			terser(),
		],
	}, */
];
