"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { type Node } from "@/types/ast";
import styles from "@/styles/RuleForm.module.scss";

interface CombineRuleType {
  ruleNames: string[];
  options: "OR" | "AND";
}
interface EvaluationDataType {
  evalData: string;
  evalRuleName: string;
}
interface EvalResult {
  ruleString: string;
  data: string;
}

export default function RuleForm() {
  const [ruleString, setRuleString] = useState("");
  const [ruleName, setRuleName] = useState<string>("");
  const [combineRules, setCombineRules] = useState<CombineRuleType>({
    ruleNames: [],
    options: "OR",
  });
  const [evaluationData, setEvaluationData] = useState<EvaluationDataType>({
    evalData: "",
    evalRuleName: "",
  });
  const [createResult, setCreateResult] = useState<Node | string | null>(null);
  const [combineResult, setCombineResult] = useState<Node | string | null>(
    null
  );
  const [evaluateResult, setEvaluateResult] = useState<EvalResult | null>(null);

  // State for managing the visibility of result sections
  const [isRulesVisible, setIsRulesVisible] = useState(false);
  const [isCreateResultVisible, setIsCreateResultVisible] = useState(false);
  const [isCombineResultVisible, setIsCombineResultVisible] = useState(false);
  const [isEvaluateResultVisible, setIsEvaluateResultVisible] = useState(false);

  // Mutations for creating, combining, and evaluating rules
  const createRuleMutation = api.ast.createRule.useMutation();
  const combineRulesMutation = api.ast.combineRules.useMutation();
  const evaluateRuleMutation = api.ast.evaluateRule.useMutation();

  const [selectedRuleName, setSelectedRuleName] = useState("");
  const [selectedRule, setSelectedRule] = useState<{
    name: string;
    ruleString: string;
    ast: object;
  } | null>(null);

  // Fetch the list of rules
  const getRulesQuery = api.ast.getRules.useQuery();

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const ast: Node | string = await createRuleMutation.mutateAsync({
        ruleName,
        ruleString,
      });
      console.log("Rule AST:", ast);
      setCreateResult(ast);
      setIsCreateResultVisible(true);
    } catch (error) {
      console.error("Error creating rule:", error);
      setCreateResult(null);
    }
  };

  const handleCombineRules = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const combinedAst: Node | string = await combineRulesMutation.mutateAsync(
        combineRules
      );
      console.log("Combined Rule AST:", combinedAst);
      setCombineResult(combinedAst);
      setIsCombineResultVisible(true);
    } catch (error) {
      console.error("Error combining rules:", error);
      setCombineResult(null);
    }
  };

  const handleEvaluateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const jsonData = JSON.parse(evaluationData.evalData) as Record<
        string,
        unknown
      >;
      const evaluationResult: EvalResult =
        await evaluateRuleMutation.mutateAsync({
          ruleName: evaluationData.evalRuleName,
          data: jsonData,
        });
      console.log("Evaluation Result:", evaluationResult);
      setEvaluateResult(evaluationResult);
      setIsEvaluateResultVisible(true);
    } catch (error) {
      console.error("Error evaluating rule:", error);
      setEvaluateResult(null);
    }
  };

  const handleSelectRule = (ruleName: string) => {
    setSelectedRuleName(ruleName);
    const rule = getRulesQuery.data?.find((e) => e.name === ruleName) ?? null;
    setSelectedRule(rule);
  };

  const ResultDisplay = ({
    result,
    isVisible,
    setIsVisible,
    buttonName = "Result",
  }: {
    result: Node | string | null | EvalResult;
    isVisible: boolean;
    setIsVisible: (isVisible: boolean) => void;
    buttonName?: string;
  }) =>
    result && (
      <div className={styles.resultSection}>
        <button
          className={styles.toggleButton}
          onClick={() => setIsVisible(!isVisible)}
        >
          {isVisible ? `Hide ${buttonName}` : `Show ${buttonName}`}
        </button>
        {isVisible && (
          <div className={styles.resultContent}>
            <h3>Result:</h3>
            <pre className={styles.resultDisplay}>
              {typeof result === "string" ? (
                result
              ) : "ruleString" in result ? (
                <>
                  <div>{"Rule = " + result.ruleString}</div>
                  <div style={{ paddingTop: "10px" }}>{result.data}</div>
                </>
              ) : (
                JSON.stringify(result, null, 2)
              )}
            </pre>
          </div>
        )}
      </div>
    );

  return (
    <div className={styles.ruleForm}>
      <h1 className={styles.header}>Rule Engine Application</h1>
      <section className={styles.formSection}>
        <h2>Available Rules</h2>
        {getRulesQuery.isLoading ? (
          <p>Loading rules...</p>
        ) : getRulesQuery.error ? (
          <p>Error loading rules: {getRulesQuery.error.message}</p>
        ) : (
          <div>
            <select
              className={styles.select}
              value={selectedRuleName}
              onChange={(e) => handleSelectRule(e.target.value)}
            >
              <option value="">Select a rule</option>
              {getRulesQuery.data?.map((rule) => (
                <option key={rule.name} value={rule.name}>
                  {rule.name}
                </option>
              )) ?? <option value="No List found" key="none"></option>}
            </select>
            {selectedRule && (
              <div>
                <h3>Rule String :</h3>
                <pre className={styles.resultDisplay}>
                  {selectedRule.ruleString}
                </pre>
              </div>
            )}
            <ResultDisplay
              result={
                JSON.stringify(selectedRule?.ast, null, 2) ?? "AST not found"
              }
              isVisible={isRulesVisible}
              setIsVisible={setIsRulesVisible}
              buttonName={"AST"}
            />
          </div>
        )}
      </section>

      <section className={styles.formSection}>
        <h2>Create Rule</h2>
        <form onSubmit={handleCreateRule}>
          <div className={styles.formGroup}>
            <label htmlFor="ruleName">Rule Name:</label>
            <input
              id="ruleName"
              type="text"
              placeholder="Enter rule name"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="ruleString">Rule:</label>
            <textarea
              id="ruleString"
              value={ruleString}
              onChange={(e) => setRuleString(e.target.value)}
              placeholder="Enter rule string"
              rows={5}
              required
            />
          </div>
          <button type="submit" className={styles.submitButton}>
            Create Rule
          </button>
        </form>
        <ResultDisplay
          result={createResult}
          isVisible={isCreateResultVisible}
          setIsVisible={setIsCreateResultVisible}
        />
      </section>

      <section className={styles.formSection}>
        <h2>Combine Rules</h2>
        <form onSubmit={handleCombineRules}>
          <div className={styles.formGroup}>
            <label htmlFor="ruleNames">Rule Names:</label>
            <input
              id="ruleNames"
              type="text"
              value={combineRules.ruleNames.join(",")}
              onChange={(e) =>
                setCombineRules({
                  ...combineRules,
                  ruleNames: e.target.value.split(","),
                })
              }
              placeholder="Enter rule names (comma-separated e.g. > rule1,rule2,rule3)"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="combineOperator">Combine Operator:</label>
            <select
              id="combineOperator"
              value={combineRules.options}
              onChange={(e) =>
                setCombineRules({
                  ...combineRules,
                  options: e.target.value as "AND" | "OR",
                })
              }
            >
              <option value="OR">OR</option>
              <option value="AND">AND</option>
            </select>
          </div>
          <button type="submit" className={styles.submitButton}>
            Combine Rules
          </button>
        </form>
        <ResultDisplay
          result={combineResult}
          isVisible={isCombineResultVisible}
          setIsVisible={setIsCombineResultVisible}
        />
      </section>

      <section className={styles.formSection}>
        <h2>Evaluate Rule</h2>
        <form onSubmit={handleEvaluateRule}>
          <div className={styles.formGroup}>
            <label htmlFor="evalRuleName">Rule Name:</label>
            <input
              id="evalRuleName"
              type="text"
              placeholder="Enter rule name"
              value={evaluationData.evalRuleName}
              onChange={(e) =>
                setEvaluationData({
                  ...evaluationData,
                  evalRuleName: e.target.value,
                })
              }
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="evalData">Evaluation Data:</label>
            <textarea
              id="evalData"
              value={evaluationData.evalData}
              onChange={(e) =>
                setEvaluationData({
                  ...evaluationData,
                  evalData: e.target.value,
                })
              }
              placeholder='Enter evaluation data as JSON (e.g. {"age": 35, "department": "Sales"})'
              rows={5}
              required
            />
          </div>
          <button type="submit" className={styles.submitButton}>
            Evaluate Rule
          </button>
        </form>
        <ResultDisplay
          result={evaluateResult}
          isVisible={isEvaluateResultVisible}
          setIsVisible={setIsEvaluateResultVisible}
        />
      </section>
    </div>
  );
}
