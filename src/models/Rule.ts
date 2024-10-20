// src/models/Rule.ts
import mongoose, { type Document, type Model } from 'mongoose';
import { type Node } from '@/types/ast';

interface IRule extends Document {
  name: string;
  ruleString: string;
  ast: Node;
}

const NodeSchema = new mongoose.Schema<Node>(
  {
    type: { type: String, required: true },
    operator: { type: String },
    left: { type: mongoose.Schema.Types.Mixed },
    right: { type: mongoose.Schema.Types.Mixed },
    attribute: { type: String },
    value: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

const RuleSchema = new mongoose.Schema<IRule>(
  {
    name: { type: String, required: true, unique: true },
    ruleString: { type: String, required: true },
    ast: { type: NodeSchema, required: true },
  },
  { timestamps: true }
);

const Rule: Model<IRule> =
  mongoose.models.Rule ?? mongoose.model<IRule>('Rule', RuleSchema);

export default Rule;
