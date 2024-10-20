import { z } from "zod";
import { createTRPCRouter as router, publicProcedure } from "@/server/api/trpc";
import { createRule, combineRules, evaluateRule, getRules } from "@/utils/parser";

export const astRouter = router({
  createRule: publicProcedure
    .input(z.object({ ruleName: z.string(), ruleString: z.string() }))
    .mutation(async ({ input: { ruleName, ruleString } }) => {
      const ast = await createRule({
        ruleName,
        ruleString,
      });
      return ast;
    }),
  combineRules: publicProcedure
    .input(z.object({ ruleNames: z.array(z.string()), options: z.union([z.literal("AND"), z.literal("OR")]) }))
    .mutation(async ({ input:{ruleNames, options} }) => {
      const combinedAst = await combineRules({ruleNames,options});
      return combinedAst;
    }),
  evaluateRule: publicProcedure
    .input(
      z.object({
        ruleName: z.string(),
        data: z.record(z.any()),
      })
    )
    .mutation(async ({ input }) => {
      const result = evaluateRule(input.ruleName, input.data);
      return result;
    }),
    getRules: publicProcedure.query(async () => {
      const res = getRules();
      return res;
    }),
});
