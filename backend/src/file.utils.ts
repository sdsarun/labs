import { mkdirSync } from 'node:fs';

export function ensureDirectoryExists(directoryPath: string) {
  mkdirSync(directoryPath, { recursive: true });
}
