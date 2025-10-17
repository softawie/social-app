import { Schema, model, Document } from "mongoose";

export interface ICounter extends Document {
  _id: string; // sequence name
  seq: number;
}

const CounterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
}, { versionKey: false, collection: "counters" });

const CounterModel = model<ICounter>("Counter", CounterSchema);
export default CounterModel;
