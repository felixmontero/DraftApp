import type { ChampionEntry, DraftState, Recommendation } from '@shared/types'
import { normalizeChampionKey } from '@shared/championKeys'
import { computeRecommendations } from './recommendations'

export interface DraftEvaluationCase {
  id: string
  label: string
  draft: DraftState
  expectedTopKeys: string[]
  maxRank?: number
}

export interface DraftEvaluationResult {
  id: string
  label: string
  passed: boolean
  expectedTopKeys: string[]
  foundKeys: string[]
  missingKeys: string[]
  topKeys: string[]
  maxRank: number
}

export interface DraftEvaluationSummary {
  total: number
  passed: number
  failed: number
  passRate: number
  results: DraftEvaluationResult[]
}

function normalizeKeys(keys: string[]): string[] {
  return keys.map(normalizeChampionKey)
}

export function evaluateRecommendations(
  testCase: DraftEvaluationCase,
  recommendations: Recommendation[]
): DraftEvaluationResult {
  const maxRank = testCase.maxRank ?? 3
  const expectedTopKeys = normalizeKeys(testCase.expectedTopKeys)
  const topKeys = normalizeKeys(recommendations.slice(0, maxRank).map(rec => rec.champion.key))
  const foundKeys = expectedTopKeys.filter(key => topKeys.includes(key))
  const missingKeys = expectedTopKeys.filter(key => !topKeys.includes(key))

  return {
    id: testCase.id,
    label: testCase.label,
    passed: missingKeys.length === 0,
    expectedTopKeys: testCase.expectedTopKeys,
    foundKeys,
    missingKeys,
    topKeys: recommendations.slice(0, maxRank).map(rec => rec.champion.key),
    maxRank
  }
}

export async function runDraftEvaluation(
  cases: DraftEvaluationCase[],
  champions: ChampionEntry[],
  idMap: Record<number, string>,
  patch: string
): Promise<DraftEvaluationSummary> {
  const results: DraftEvaluationResult[] = []

  for (const testCase of cases) {
    const recommendations = await computeRecommendations(testCase.draft, champions, idMap, patch)
    results.push(evaluateRecommendations(testCase, recommendations))
  }

  const passed = results.filter(result => result.passed).length
  const total = results.length

  return {
    total,
    passed,
    failed: total - passed,
    passRate: total === 0 ? 1 : passed / total,
    results
  }
}

export function formatEvaluationSummary(summary: DraftEvaluationSummary): string {
  const percent = Math.round(summary.passRate * 100)
  const lines = [`Draft evaluation: ${summary.passed}/${summary.total} passed (${percent}%)`]

  for (const result of summary.results) {
    const marker = result.passed ? 'PASS' : 'FAIL'
    lines.push(
      `${marker} ${result.id}: expected [${result.expectedTopKeys.join(', ')}] in top ${result.maxRank}; got [${result.topKeys.join(', ')}]`
    )
  }

  return lines.join('\n')
}
