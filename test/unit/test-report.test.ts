import { expect, test } from 'vitest'
import type { JSONReportTest } from '@playwright/test/reporter'
import { renderTests, replaceTests } from '../../scripts/test-report.ts'
import type {
  BrowserReport,
  CoverageReport,
  VitestReport,
} from '../../scripts/test-report.ts'

const vitest: VitestReport = {
  numPassedTests: 46,
  numFailedTests: 0,
  numPendingTests: 0,
  numTodoTests: 0,
  success: true,
}
const coverage: CoverageReport = {
  total: {
    statements: { pct: 100 },
    branches: { pct: 95 },
    functions: { pct: 90 },
    lines: { pct: 85 },
  },
}

function browserReport(statuses: JSONReportTest['status'][]): BrowserReport {
  return {
    errors: [],
    suites: [
      {
        title: 'file',
        file: 'test.ts',
        line: 1,
        column: 1,
        specs: [],
        suites: [
          {
            title: 'nested describe',
            file: 'test.ts',
            line: 1,
            column: 1,
            specs: [
              {
                title: 'case',
                tags: [],
                ok: true,
                id: 'case',
                file: 'test.ts',
                line: 1,
                column: 1,
                tests: statuses.map((status) => ({
                  projectName: 'chromium',
                  projectId: 'chromium',
                  status,
                  expectedStatus: 'passed',
                  timeout: 30_000,
                  annotations: [],
                  results: [],
                })),
              },
            ],
          },
        ],
      },
    ],
  }
}

test('renders measured test counts and coverage without claiming unrun browsers passed', () => {
  const body = renderTests(
    vitest,
    coverage,
    browserReport(['expected', 'expected'])
  )
  expect(body).toContain(
    'Vitest: 46 passed, 0 failed, 0 skipped, 0 todo. Result: passed.'
  )
  expect(body).toContain('| 100% | 95% | 90% | 85% |')
  expect(body).toContain('| Chromium | Passed | 2 | 0 | 0 | 0 |')
  expect(body).toContain('| WebKit | Not run | 0 | 0 | 0 | 0 |')
})

test.each([
  ['unexpected', 'Failed', '0 | 1 | 0 | 0'],
  ['flaky', 'Flaky', '0 | 0 | 1 | 0'],
  ['skipped', 'Incomplete', '0 | 0 | 0 | 1'],
] as const)(
  'reports %s browser outcomes accurately',
  (status, label, counts) => {
    expect(renderTests(vitest, coverage, browserReport([status]))).toContain(
      `| Chromium | ${label} | ${counts} |`
    )
  }
)

test('reports failed test runs and global browser errors', () => {
  const report = browserReport(['expected'])
  report.errors.push({ message: 'Web server failed' })
  const body = renderTests(
    { ...vitest, numFailedTests: 1, success: false },
    undefined,
    report
  )
  expect(body).toContain('1 failed')
  expect(body).toContain('Result: failed.')
  expect(body).toContain('Browser runner errors: 1.')
  expect(body).toContain('Coverage was not collected')
})

test('reports missing results and failed runner exits without stale success claims', () => {
  const missing = renderTests(undefined, undefined, undefined, {
    coverage: 1,
    browser: 1,
  })
  expect(missing).toContain('Vitest: runner failed')
  expect(missing).toContain('Browser runner failed')
  expect(missing.match(/\| Not run \|/g)).toHaveLength(10)
  expect(renderTests(vitest, coverage, undefined, { coverage: 1 })).toContain(
    'Result: failed.'
  )
})

test.each(['\n', '\r\n'])(
  'preserves all README content outside Tests with %j line endings',
  (newline) => {
    const before = [
      '# Package',
      '',
      'User-authored text.',
      '',
      '## Tests',
      '',
    ].join(newline)
    const after = ['## License', '', 'Apache-2.0', ''].join(newline)
    const source = before + newline + 'Old results' + newline + newline + after
    const result = replaceTests(source, 'New results\n\n### Coverage\n\n100%')
    expect(result.startsWith(before)).toBe(true)
    expect(result.endsWith(after)).toBe(true)
    expect(result).not.toContain('Old results')
    expect(result).toContain(`New results${newline}${newline}### Coverage`)
    expect(replaceTests(result, 'New results\n\n### Coverage\n\n100%')).toBe(
      result
    )
  }
)

test('refuses to overwrite a README without a Tests section', () => {
  expect(() => replaceTests('# Package\n\n## License\n', 'Results')).toThrow(
    'Missing README section: Tests'
  )
})

test('reports native WebAuthn separately from mocked wrapper tests', () => {
  const report = browserReport(['expected'])
  report.suites[0]!.suites![0]!.specs[0]!.file =
    'test/compatibility/browsers/native.spec.ts'
  const [wrapper, native] = renderTests(vitest, coverage, report).split(
    '### Native WebAuthn and PRF'
  )
  expect(wrapper).toContain('| Chromium | Not run | 0 | 0 | 0 | 0 |')
  expect(native).toContain('| Chromium | Passed | 1 | 0 | 0 | 0 |')
})
