// src/types/ast.ts
export type Operator = 'AND' | 'OR' | '>' | '<' | '=' | '>=' | '<=';

export interface Node {
  type: 'operator' | 'operand';
  operator?: Operator;
  left?: Node;
  right?: Node;
  attribute?: string;
  value?: string | number;
}
