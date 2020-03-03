import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from "@rollup/plugin-commonjs";
import replace from '@rollup/plugin-replace';
import { terser } from "rollup-plugin-terser";

const env = process.env.NODE_ENV || 'production';

export default {
  input: 'src/app.ts',
  output: {
		file: 'build/bundle.' + env + '.js',
		format: 'esm',
    sourcemap: true
	},
  plugins: [
    typescript(),
    replace({
      __buildEnv__: env,
    }),
    resolve({ jsnext: true }),
    commonjs(),
    terser(),
  ],
};
