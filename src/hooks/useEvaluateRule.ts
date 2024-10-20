import { useState } from 'react';
import { evaluateRule } from '@/utils/parser';

interface Result{
  ruleString:string,
  data:string
}
export function useEvaluateRule() {
  const [result, setResult] = useState<Result>();
  const [error, setError] = useState<string | null>(null);

  const evaluate = async (ruleName: string, data: Record<string, unknown>) => {
    try {
      const res = await evaluateRule(ruleName, data);
      setResult(res);
      setError(null);
    } catch (err) {
      setResult({ruleString:'',data:"Failed to evaluate"});
      setError((err as Error).message);
    }
  };

  return { result, error, evaluate };
}
