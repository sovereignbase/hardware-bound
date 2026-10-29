import { spawnSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { dirname } from 'node:path'
import { paths, updateReadme } from './test-report.ts'

const root = new URL('../', import.meta.url)
const [suite = 'all', ...args] = process.argv.slice(2)
if (!['all', 'coverage', 'browser'].includes(suite)) {
  throw new Error(`Unknown test suite: ${suite}`)
}

mkdirSync(dirname(paths.vitest), { recursive: true })
// Clear only the suites being rerun, including coverage disabled by CLI flags.
if (suite !== 'browser') {
  rmSync(paths.vitest, { force: true })
  rmSync(paths.coverage, { force: true })
}
if (suite !== 'coverage') rmSync(paths.browsers, { force: true })

let status = 0
const exitCodes: { coverage?: number; browser?: number } = {}
const run = (command: string[]): number => {
  const result = spawnSync(process.execPath, command, {
    cwd: root,
    stdio: 'inherit',
    windowsHide: true,
  })
  if (result.error) console.error(result.error)
  const code = result.status ?? 1
  if (code !== 0) status ||= code
  return code
}

try {
  if (suite !== 'browser') {
    exitCodes.coverage = run([
      'node_modules/vitest/vitest.mjs',
      'run',
      '--coverage',
      ...(suite === 'coverage' ? args : []),
    ])
  }
  // A Vitest or coverage failure must not prevent browser verification.
  if (suite !== 'coverage') {
    exitCodes.browser = run(['test/compatibility/browsers/run.ts', ...args])
  }
} finally {
  await updateReadme(exitCodes)
}
process.exitCode = status
