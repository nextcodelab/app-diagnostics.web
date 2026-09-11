import type { LogRepository } from "./logRepository";
import { FirebaseLogRepository } from "./firebaseLogRepository";

const repository: LogRepository =
  new FirebaseLogRepository();

export function getLogRepository(): LogRepository {
  return repository;
}