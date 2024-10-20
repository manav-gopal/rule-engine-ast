// src/models/Attribute.ts
import mongoose, { Schema, type Document, type Model } from 'mongoose';

interface IAttribute extends Document {
  attributeName: string;
  dataType: 'String' | 'Number' | 'Boolean';
  allowedValues: Array<string | number | boolean> | null;
}

const AttributeSchema = new Schema<IAttribute>(
  {
    attributeName: { type: String, required: true, unique: true },
    dataType: { type: String, enum: ['String', 'Number', 'Boolean'], required: true },
    allowedValues: { type: [Schema.Types.Mixed], default: null }, // Mixed allows flexibility for multiple types
  },
  { timestamps: true }
);

const Attribute: Model<IAttribute> =
  mongoose.models.Attribute ?? mongoose.model<IAttribute>('Attribute', AttributeSchema);

export default Attribute;
