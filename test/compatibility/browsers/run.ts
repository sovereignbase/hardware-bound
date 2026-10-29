import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { build } from 'esbuild'

const outDir = resolve(import.meta.dirname, 'fixtures')
const entryFile = resolve(outDir, 'entry.ts')
const bundleFile = resolve(outDir, 'hardware-bound.bundle.js')

await build({
  entryPoints: [entryFile],
  outfile: bundleFile,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  globalName: 'HardwareBoundBundle',
  external: ['node:*'],
})

const cli = resolve(
  process.cwd(),
  'node_modules',
  '@playwright',
  'test',
  'cli.js'
)
const result = spawnSync(
  process.execPath,
  [cli, 'test', '--config', 'playwright.config.ts', ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    env: process.env,
  }
)

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}
