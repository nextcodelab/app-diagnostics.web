
import type { ProcessedLog } from './processedLog';

export interface ErrorGroup {
  key: string;
  exceptionType: string;
  mainStackFrame: string;
  shortMessage: string;
  level: string;
  occurrences: ProcessedLog[];
  affectedSessions: Set<string>;
  versions: Set<string>;
  latestOccurrence: Date;
  isRegression?: boolean;
}