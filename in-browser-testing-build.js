import { build } from 'esbuild'

build({
  entryPoints: ['./in-browser-testing-lib.ts'],
  outfile: './index.js',
  bundle: true,
  external: ['node:*'],
  platform: 'browser',
  format: 'esm',
})
