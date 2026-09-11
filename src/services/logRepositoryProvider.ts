// import type { LogRepository } from "./logRepository";
// import { FirebaseLogRepository } from "./firebase/firebaseLogRepository";

// const repository: LogRepository =
//   new FirebaseLogRepository();

// export function getLogRepository(): LogRepository {
//   return repository;
// }


// ============================================================
// Migrated to Cloudflare for better scalability and up to 2M reads.
// ============================================================
import type { LogRepository } from "./logRepository";
import { CloudflareLogRepository } from "./cloudflare/cloudflareLogRepository";

const repository: LogRepository =
  new CloudflareLogRepository();

export function getLogRepository(): LogRepository {
  return repository;
}