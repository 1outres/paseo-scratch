import path from "node:path";
import type { ProjectSummary } from "../ports/paseo";

export function findProjectByRoot<Project extends ProjectSummary>(
  projects: readonly Project[],
  root: string,
): Project | null {
  const target = path.resolve(root);
  return projects.find((project) => path.resolve(project.projectRootPath) === target) ?? null;
}
