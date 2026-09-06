import type { RawLog } from "./rawLog";


export interface ProcessedLog extends RawLog {
  errorGroupKey: string;
  exceptionType: string;
  mainStackFrame: string;
  shortMessage: string;
}