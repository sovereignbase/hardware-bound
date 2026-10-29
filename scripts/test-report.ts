import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { format, resolveConfig } from 'prettier'
import type {
  JSONReport,
  JSONReportSuite,
  JSONReportTest,
} from '@playwright/test/reporter'

export const paths = {
  readme: fileURLToPath(new URL('../README.md', import.meta.url)),
  vitest: fileURLToPath(
    new URL('../test/.results/vitest.json', import.meta.url)
  ),
  browsers: fileURLToPath(
    new URL('../test/.results/browsers.json', import.meta.url)
  ),
  status: fileURLToPath(
    new URL('../test/.results/status.json', import.meta.url)
  ),
  coverage: fileURLToPath(
    new URL('../coverage/coverage-summary.json', import.meta.url)
  ),
}

export interface VitestReport {
  numPassedTests: number
  numFailedTests: number
  numPendingTests: number
  numTodoTests: number
  success: boolean
}

export type BrowserReport = Pick<JSONReport, 'suites' | 'errors'>
export type ExitCodes = { coverage?: number; browser?: number }

const metrics = ['statements', 'branches', 'functions', 'lines'] as const
export type CoverageReport = {
  total: Record<(typeof metrics)[number], { pct: number }>
}

const browsers = [
  ['chromium', 'Chromium'],
  ['firefox', 'Firefox'],
  ['webkit', 'WebKit'],
  ['mobile-chrome', 'Mobile Chrome (Pixel 5 emulation)'],
  ['mobile-safari', 'Mobile Safari (iPhone 12 emulation)'],
] as const

function table(rows: string[][]): string {
  return rows
    .map((row, index) => {
      const line = `| ${row.join(' | ')} |`
      return index === 0
        ? `${line}\n| ${row.map(() => '---').join(' | ')} |`
        : line
    })
    .join('\n')
}

function browserTests(suites: JSONReportSuite[]): JSONReportTest[] {
  return suites.flatMap((suite) => [
    ...suite.specs.flatMap((spec) => spec.tests),
    ...browserTests(suite.suites ?? []),
  ])
}

/** Render only measured results; absent or filtered-out suites are unverified. */
export function renderTests(
  vitest?: VitestReport,
  coverage?: CoverageReport,
  report?: BrowserReport,
  exitCodes: ExitCodes = {}
): string {
  const tests = browserTests(report?.suites ?? [])
  const rows = browsers.map(([name, label]) => {
    const results = tests.filter((test) => test.projectName === name)
    const passed = results.filter((test) => test.status === 'expected').length
    const failed = results.filter((test) => test.status === 'unexpected').length
    const flaky = results.filter((test) => test.status === 'flaky').length
    const skipped = results.filter((test) => test.status === 'skipped').length
    const status = !results.length
      ? 'Not run'
      : failed
        ? 'Failed'
        : flaky
          ? 'Flaky'
          : skipped
            ? 'Incomplete'
            : 'Passed'
    return [
      label,
      status,
      String(passed),
      String(failed),
      String(flaky),
      String(skipped),
    ]
  })

  return [
    vitest
      ? `Vitest: ${vitest.numPassedTests} passed, ${vitest.numFailedTests} failed, ${vitest.numPendingTests} skipped, ${vitest.numTodoTests} todo. Result: ${vitest.success && !exitCodes.coverage ? 'passed' : 'failed'}.`
      : exitCodes.coverage
        ? 'Vitest: runner failed before results were available.'
        : 'Vitest: not run.',
    '',
    '### Coverage',
    '',
    coverage
      ? table([
          ['Statements', 'Branches', 'Functions', 'Lines'],
          metrics.map((metric) => `${coverage.total[metric].pct}%`),
        ])
      : 'Coverage was not collected in the latest Vitest run.',
    '',
    '### Browser compatibility',
    '',
    table([
      ['Browser', 'Result', 'Passed', 'Failed', 'Flaky', 'Skipped'],
      ...rows,
    ]),
    ...(report?.errors.length
      ? ['', `Browser runner errors: ${report.errors.length}.`]
      : []),
    ...(exitCodes.browser && !report
      ? ['', 'Browser runner failed before results were available.']
      : []),
    '',
    'Browser checks use mocked WebAuthn responses.',
  ].join('\n')
}

/** Replace the Tests body while preserving surrounding text and line endings. */
export function replaceTests(source: string, body: string): string {
  const heading = /^## Tests[ \t]*\r?\n/m.exec(source)
  if (!heading) throw new Error('Missing README section: Tests')
  const start = heading.index + heading[0].length
  const next = /^## /m.exec(source.slice(start))
  const end = next ? start + next.index : source.length
  const newline = source.includes('\r\n') ? '\r\n' : '\n'
  return (
    source.slice(0, start) +
    newline +
    body.trim().replace(/\r?\n/g, newline) +
    newline +
    newline +
    source.slice(end)
  )
}

function readReport<T>(path: string): T | undefined {
  return existsSync(path)
    ? (JSON.parse(readFileSync(path, 'utf8')) as T)
    : undefined
}

/** Refresh the README from tool-generated reports after successful or failed runs. */
export async function updateReadme(exitCodes: ExitCodes = {}): Promise<void> {
  const status = { ...readReport<ExitCodes>(paths.status), ...exitCodes }
  writeFileSync(paths.status, JSON.stringify(status, null, 2) + '\n')
  const body = renderTests(
    readReport<VitestReport>(paths.vitest),
    readReport<CoverageReport>(paths.coverage),
    readReport<JSONReport>(paths.browsers),
    status
  )
  const formatted = await format(body, {
    ...(await resolveConfig(paths.readme)),
    parser: 'markdown',
  })
  const original = readFileSync(paths.readme, 'utf8')
  const updated = replaceTests(original, formatted)
  if (updated !== original) writeFileSync(paths.readme, updated)
}
