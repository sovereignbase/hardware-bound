import { build } from 'esbuild'

build({
  entryPoints: ['./in-browser-testing-libs.js'],
  outfile: './index.js',
  bundle: true,
  external: ['node:*'],
  platform: 'browser',
  format: 'esm',
})
