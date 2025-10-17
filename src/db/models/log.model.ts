import { Schema, model, Document } from "mongoose";

export interface ILog extends Document {
  id: number; // sequential numeric id used by UI
  timestamp: string; // ISO string
  method: string;
  url: string;
  status: number;
  responseTime: number;
  ip: string;
  userAgent: string;
  requestHeaders?: Record<string, any>;
  responseHeaders?: Record<string, any>;
  requestBody?: any;
  responseBody?: any;
  error?: any;
}

const LogSchema = new Schema<ILog>({
  id: { type: Number, required: true, index: true, unique: true },
  timestamp: { type: String, required: true, index: true },
  method: { type: String, required: true, index: true },
  url: { type: String, required: true },
  status: { type: Number, required: true, index: true },
  responseTime: { type: Number, required: true },
  ip: { type: String, required: true },
  userAgent: { type: String, required: true },
  requestHeaders: { type: Schema.Types.Mixed },
  responseHeaders: { type: Schema.Types.Mixed },
  requestBody: { type: Schema.Types.Mixed },
  responseBody: { type: Schema.Types.Mixed },
  error: { type: Schema.Types.Mixed },
}, { timestamps: false, versionKey: false, collection: "logs" });

LogSchema.index({ timestamp: -1 });
LogSchema.index({ method: 1, status: 1 });

const LogModel = model<ILog>("Log", LogSchema);
export default LogModel;
