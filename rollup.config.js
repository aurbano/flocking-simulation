import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from "@rollup/plugin-commonjs";

export default {
  input: 'src/app.ts',
  output: {
		file: 'build/bundle.js',
		format: 'esm',
    sourcemap: true
	},
  plugins: [
    typescript(),
    resolve({ jsnext: true }),
    commonjs(),
  ],
};
