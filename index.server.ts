import { homedir } from "node:os";
import type { PluginServerContext } from "@getpaseo/plugin/server";
import { consoleLogger } from "./server/adapters/console-logger";
import { nodeFileSystem } from "./server/adapters/node-file-system";
import { createPaseoPort } from "./server/adapters/paseo-sdk";
import { systemClock } from "./server/adapters/system-clock";
import { createScratchServer } from "./server/composition";
import { logFailures, reportFailures } from "./server/services/failure-reporting";
import { ensureScratchProject } from "./shared/scratch-project-rpc";
import { createScratchTask } from "./shared/scratch-task-rpc";

export default function contribute(server: PluginServerContext) {
  const scratch = createScratchServer({
    home: { paseoHomeEnv: process.env.PASEO_HOME, homeDirectory: homedir(), cwd: process.cwd() },
    fs: nodeFileSystem,
    clock: systemClock,
  });

  server.handle(ensureScratchProject, (_input, { paseo }) =>
    reportFailures(consoleLogger, "Could not set up the scratchpad project at app start.", async () => {
      const { projectId } = await scratch.projects.ensure(createPaseoPort(paseo));
      return { projectId };
    }),
  );

  server.handle(createScratchTask, (input, { paseo }) => scratch.createTask.create(input, createPaseoPort(paseo)));

  server.before("workspace.create", ({ request }, { paseo }) =>
    scratch.workspaceCreateRewriter.rewrite(request, createPaseoPort(paseo)),
  );

  server.on("agent.created", ({ agent }, { paseo }) =>
    scratch.titleFiller.handleAgentCreated(agent, createPaseoPort(paseo)),
  );

  server.on("workspace.archived", ({ workspace }, { paseo }) =>
    logFailures(
      consoleLogger,
      `Could not archive the task directory of workspace ${workspace.id} (${workspace.cwd}).`,
      () => scratch.archiver.handleWorkspaceArchived(workspace, createPaseoPort(paseo)),
    ),
  );

  return () => {};
}
