import { Project } from 'ts-morph';
import * as path from 'path';

interface CacheKey {
  tsconfigPath: string;
}

let cached: { key: CacheKey; project: Project } | null = null;

export function getTsMorphProject(tsconfigPath?: string): Project {
  const resolved = tsconfigPath ? path.resolve(tsconfigPath) : path.resolve('tsconfig.json');
  if (cached && cached.key.tsconfigPath === resolved) return cached.project;
  const project = new Project({ tsConfigFilePath: resolved });
  cached = { key: { tsconfigPath: resolved }, project };
  return project;
}

export function resetProjectCache() { cached = null; }
