import React, { useState } from 'react';
import { api } from '../../lib/api';
import {
  TestTube2,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  ShieldCheck,
  Code2,
  Loader2,
} from 'lucide-react';

export const ScenarioTestRunnerPage: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [summary, setSummary] = useState<any>(null);

  const runTests = async () => {
    setIsRunning(true);
    try {
      const res = await api.runTestScenarios();
      setResults(res.results || []);
      setSummary({ total: res.totalScenarios, allPassed: res.allPassed });
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Automated Engine Verification</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Scenario Test Suite</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Verifies the 5 mission-critical specification scenarios: multi-field extraction, natural language intake, corrections, deterministic validation, and condition state pruning.
          </p>
        </div>

        <button
          onClick={runTests}
          disabled={isRunning}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Executing Scenarios...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Run All 5 Test Scenarios</span>
            </>
          )}
        </button>
      </div>

      {/* Summary Banner if results present */}
      {summary && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold ${
            summary.allPassed
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center space-x-2">
            {summary.allPassed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-600" />
            )}
            <span>
              {summary.allPassed
                ? 'All 5 Spec Scenarios Passed Successfully! Zero regressions detected.'
                : 'Some scenarios encountered failures.'}
            </span>
          </div>
          <span className="bg-white/80 px-2.5 py-1 rounded border border-gray-300">
            {results?.filter((r) => r.passed).length} / {summary.total} Passed
          </span>
        </div>
      )}

      {/* Scenarios List */}
      <div className="space-y-4">
        {results ? (
          results.map((res, idx) => (
            <div
              key={idx}
              className={`p-5 rounded-xl border transition shadow-2xs ${
                res.passed ? 'bg-white border-emerald-200' : 'bg-rose-50/40 border-rose-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5">
                    {res.passed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-900">{res.scenario}</h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Deterministic engine response verified against specification criteria.
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    res.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {res.passed ? 'PASSED' : 'FAILED'}
                </span>
              </div>

              {/* Diagnostic Payload */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <details className="text-[11px] text-gray-600 cursor-pointer">
                  <summary className="font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1">
                    <Code2 className="w-3.5 h-3.5" />
                    <span>View Scenario Execution Diagnostics & Payload</span>
                  </summary>
                  <pre className="mt-2 bg-gray-900 text-emerald-400 p-3 rounded-lg font-mono text-[10px] overflow-x-auto">
                    {JSON.stringify(res.details, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white p-12 rounded-xl border border-dashed border-gray-300 text-center">
            <TestTube2 className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-gray-900">Interactive Test Suite Ready</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              Click the button above to execute all 5 scenarios against the live server-side extraction & deterministic validation engine.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
