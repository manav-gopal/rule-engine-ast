import { type Node } from "@/types/ast";
import Rule from "@/models/Rule";
import Attribute from "@/models/Attribute";

// Tokenizer function
function tokenize(ruleString: string): string[] {
  const tokens = ruleString.match(
    /\w+|<=|>=|<>|!=|=|<|>|\(|\)|'[^']*'|"[^"]*"|AND|OR/g
  );
  return tokens ?? [];
}

// Simplified Parser function
function parseTokens(tokens: string[]): Node {
  let position = 0;

  function parseExpression(): Node {
    let node = parseTerm();

    while (position < tokens.length && tokens[position] === "OR") {
      position++; // move past 'OR'
      const rightNode = parseTerm();
      node = {
        type: "operator",
        operator: "OR",
        left: node,
        right: rightNode,
      };
    }

    return node;
  }

  function parseTerm(): Node {
    let node = parseFactor();

    while (position < tokens.length && tokens[position] === "AND") {
      position++; // move past 'AND'
      const rightNode = parseFactor();
      node = {
        type: "operator",
        operator: "AND",
        left: node,
        right: rightNode,
      };
    }

    return node;
  }

  function parseFactor(): Node {
    if (position < tokens.length && tokens[position] === "(") {
      position++; // move past '('
      const node = parseExpression();
      if (position < tokens.length && tokens[position] === ")") {
        position++; // move past ')'
      } else {
        throw new Error("Expected closing parenthesis");
      }
      return node;
    } else {
      return parseOperand();
    }
  }

  function parseOperand(): Node {
    if (position + 2 >= tokens.length) {
      throw new Error("Incomplete operand");
    }

    const attribute = tokens[position++];
    const operator = tokens[position++];
    let value: string | undefined | number = tokens[position++];

    // Check if value is a string and if it starts and ends with quotes
    if (
      typeof value === "string" &&
      ((value.startsWith("'") && value.endsWith("'")) ||
        (value.startsWith('"') && value.endsWith('"')))
    ) {
      // Remove the quotes and keep as string
      value = value.slice(1, -1);
    } else if (typeof value === "string") {
      // Try to parse as number
      const numValue = Number(value);
      if (!isNaN(numValue)) {
        value = numValue;
      }
    }

    return {
      type: "operand",
      operator: operator as Node["operator"],
      attribute,
      value,
    };
  }

  const ast = parseExpression();

  if (position < tokens.length) {
    throw new Error("Unexpected tokens at the end");
  }

  return ast;
}

// Validate attributes
async function validateAttributes(ast: Node) {
  const attributes = extractAttributes(ast);

  // Fetch valid attributes from the database
  const existingAttributes = await Attribute.find({
    attributeName: { $in: attributes },
  }).exec();

  const existingAttributeNames = existingAttributes.map(
    (attr) => attr.attributeName
  );

  // Find attributes that are missing in the database
  const missingAttributes = attributes.filter(
    (attr) => !existingAttributeNames.includes(attr)
  );

  // Insert missing attributes into the database
  if (missingAttributes.length > 0) {
    console.log(
      `Inserting missing attributes: ${missingAttributes.join(", ")}`
    );
    const newAttributes = missingAttributes.map((attr) => ({
      attributeName: attr,
      dataType: guessDataType(attr), // You can guess the data type or set a default value
    }));

    await Attribute.insertMany(newAttributes);
    console.log(
      `Attributes ${missingAttributes.join(", ")} inserted successfully.`
    );
  }

  // Re-fetch all attributes to ensure validation
  const allAttributes = await Attribute.find({
    attributeName: { $in: attributes },
  }).exec();

  const allAttributeNames = allAttributes.map((attr) => attr.attributeName);

  // Ensure all attributes used in the AST are valid
  attributes.forEach((attr) => {
    if (!allAttributeNames.includes(attr)) {
      throw new Error(`Attribute ${attr} is not in the catalog`);
    }
  });
}

// Helper function to guess or define data type (can be expanded)
function guessDataType(attribute: string): "String" | "Number" | "Boolean" {
  // Define logic to guess data types based on attribute name
  // This is a basic example; you can enhance this based on your use case
  if (
    attribute.toLowerCase().includes("age") ||
    attribute.toLowerCase().includes("salary")
  ) {
    return "Number";
  }
  return "String"; // Default to String
}

// Extract attributes from AST
function extractAttributes(ast: Node): string[] {
  const attributes: string[] = [];

  function traverse(node: Node) {
    if (node.type === "operand" && node.attribute) {
      attributes.push(node.attribute);
    }
    if (node.left) traverse(node.left);
    if (node.right) traverse(node.right);
  }

  traverse(ast);
  return attributes;
}

// Create rule
export async function createRule({
  ruleName,
  ruleString,
}: {
  ruleName: string;
  ruleString: string;
}): Promise<Node | string> {
  // Check if the rule name already exists
  const existingRule = await Rule.findOne({ name: ruleName });

  if (existingRule) {
    return `A rule with the name "${ruleName}" already exists.`;
  }

  // Proceed with tokenizing, parsing, and validating the rule string
  const tokens = tokenize(ruleString);
  const ast = parseTokens(tokens);
  await validateAttributes(ast);

  // Create the new rule
  const rule = new Rule({
    name: ruleName,
    ruleString,
    ast,
  });

  await rule.save();
  return ast;
}

// Combine rules based on rule names and an optional operator (AND/OR)
export async function combineRules({
  ruleNames,
  options,
}: {
  ruleNames: string[];
  options: "AND" | "OR";
}): Promise<Node | string> {
  // Fetch the rules from the database
  const rules = await Rule.find({ name: { $in: ruleNames } }).exec();

  // Check if all rules exist
  if (rules.length !== ruleNames.length) {
    const missingRules = ruleNames.filter(
      (ruleName) => !rules.some((rule) => rule.name === ruleName)
    );
    return `The following rules do not exist: ${missingRules.join(", ")}`;
  }

  // Combine the ASTs
  const asts = rules.map((rule) => rule.ast);
  let combinedAst = asts[0];

  for (let i = 1; i < asts.length; i++) {
    combinedAst = {
      type: "operator",
      operator: options, // Use the provided operator (default is OR)
      left: combinedAst,
      right: asts[i],
    };
  }

  return combinedAst!;
}

interface EvalPromise {
  ruleString: string;
  data: string;
}
// Evaluate rule
export async function evaluateRule(
  ruleName: string,
  data: Record<string, unknown>
): Promise<EvalPromise> {
  try {
    // Fetch the rule from the database by ruleName
    const rule = await Rule.findOne({ name: ruleName });

    if (!rule) {
      return {
        ruleString: "",
        data: `Error: Rule with name "${ruleName}" not found`,
      };
    }

    const ast = rule.ast;
    const ruleString = rule.ruleString;

    console.log("Evaluating AST:", JSON.stringify(ast, null, 2)); // Log AST for debugging
    console.log("Evaluation Data:", data); // Log input data for debugging

    // Evaluate the AST recursively
    return { ruleString, data: evaluateAST(ast, data) };
  } catch (error) {
    return { ruleString: "", data: `Error: ${(error as Error).message}` };
  }
}

// Helper function to evaluate the AST recursively
function evaluateAST(ast: Node, data: Record<string, unknown>): string {
  if (ast.type === "operator") {
    const leftResult = evaluateAST(ast.left!, data);
    const rightResult = evaluateAST(ast.right!, data);

    if (ast.operator === "AND") {
      return leftResult === "Passed Evaluation" &&
        rightResult === "Passed Evaluation"
        ? "Passed Evaluation"
        : "Failed Evaluation";
    } else if (ast.operator === "OR") {
      return leftResult === "Passed Evaluation" ||
        rightResult === "Passed Evaluation"
        ? "Passed Evaluation"
        : "Failed Evaluation";
    }
  } else if (ast.type === "operand") {
    const dataValue = data[ast.attribute!];
    if (dataValue === undefined) return "Failed Evaluation";

    switch (ast.operator) {
      case ">":
      case "<":
      case ">=":
      case "<=":
        if (typeof dataValue === "number" && typeof ast.value === "number") {
          switch (ast.operator) {
            case ">":
              return dataValue > ast.value
                ? "Passed Evaluation"
                : "Failed Evaluation";
            case "<":
              return dataValue < ast.value
                ? "Passed Evaluation"
                : "Failed Evaluation";
            case ">=":
              return dataValue >= ast.value
                ? "Passed Evaluation"
                : "Failed Evaluation";
            case "<=":
              return dataValue <= ast.value
                ? "Passed Evaluation"
                : "Failed Evaluation";
          }
        } else {
          return `Error: Operator '${ast.operator}' requires numeric operands`;
        }
      case "=":
        return dataValue == ast.value
          ? "Passed Evaluation"
          : "Failed Evaluation"; // Using loose equality
      default:
        return `Error: Unknown operator ${ast.operator}`;
    }
  }

  return "Error: Invalid AST node";
}

export async function getRules() {
  const rules = await Rule.find().exec();
  return rules.map((rule: { name: string, ruleString: string, ast: object}) => ({
    name: rule.name,
    ruleString: rule.ruleString,
    ast: rule.ast,
  }));
}
