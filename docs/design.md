# paseo-scratch design

## Goal

Some tasks do not belong to any code directory. Examples are one-off scripts,
small experiments, research, and writing. The plugin does not limit the kind
of task. It lets the user start such tasks quickly in Paseo. All of them live
in one Paseo project called `scratchpad`.

The plugin is public. It must not depend on the author's machine.

Target: Paseo `>=0.11.2`.

## Terms

- **Root**: the directory of the `scratchpad` project.
- **Task directory**: one directory under the root. One task uses one task
  directory.
- **Task workspace**: a Paseo workspace whose cwd is a task directory.

## Directory layout

```
${PASEO_HOME:-~/.paseo}/scratchpad/          <- root, project "scratchpad"
├── 2026-10-11-csv-パーサ検証/               <- task with a name
└── 2026-10-11-1432/                         <- task without a name
```

### Root path

- Resolve the Paseo home with the same rule as Paseo itself:
  `PASEO_HOME` if it is set, otherwise `~/.paseo`.
  - A leading `~/` (or a bare `~`) expands to the home directory.
  - A relative path resolves against the process cwd.
- Root = `<paseo home>/scratchpad`.
- There is no plugin setting for the root path.
- If the root is inside a git repository, report an error and stop. Paseo would
  treat the root as part of that repository.

### Task directory name

- With a name: `YYYY-MM-DD-<slug>`
- Without a name: `YYYY-MM-DD-HHMM`
- The date and time use the local time of the daemon host.
- If the name is already used in the root or in `<root>/.archive/`, add
  `-2`, `-3`, and so on. A name is never used twice, so an archived task can
  always move back to the root with its own name.
- Create the directory with a non-recursive `mkdir`, so two requests can not
  get the same directory.
- The new directory is empty. Do not run `git init`.

### Slug rules

Input: the name the user typed.

1. Apply Unicode NFKC normalization (full-width letters become half-width).
2. Lowercase ASCII letters.
3. Replace these characters with `-`: whitespace, symbols, path separators,
   characters not allowed in file names (`<>:"/\|?*`), and control characters.
4. Keep Unicode letters and digits, for example Japanese.
5. Join runs of `-` into one `-`.
6. Remove `-` and `.` at the start and the end.
7. Cut to 50 characters.
8. If the result is empty, it is an input error. Show the error on the
   screen. Do not switch to the name without a slug.

Example: `CSV パーサ検証` -> `csv-パーサ検証`

## Project

- The project is a non-git Paseo project. Its root path is the root.
- Its display name comes from the basename of the root: `scratchpad`.
  Users can rename it with Paseo itself (`customName`).
- Find the project by comparing `projectRootPath` in the entries of
  `paseo.projects.list()`. Do not store the project ID.
- A deleted project is removed from the list. The list has no archived
  projects.

### Make sure the project exists

When to run it:

- When the client part of the plugin starts in the app, it calls a server
  RPC that runs this. The server part can not do it on its own start,
  because the server `contribute()` context has no `paseo`.
- Before each task is created (in the task RPC and in the
  `workspace.create` hook).

Steps:

1. Create the root directory if it does not exist. Do this every time, also
   when the project already exists. The user may have deleted the root.
2. If a project with the root as `projectRootPath` exists, use it.
3. Otherwise:
   1. Call `paseo.workspaces.open(root)`. This creates the project and a
      workspace for the root.
   2. Archive that root workspace at once. The project stays in the sidebar as
      an empty project with its "+" button.

Do not watch for project deletion. If the user deletes the project, it comes
back the next time the app loads the plugin or a task is created.

## Entry points

### 1. Sidebar: "New Scratchpad"

- Add a row with `addSidebarHeaderItem`. It is in the top navigation rows,
  next to the built-in "New workspace" row. Users can move or hide it in
  Settings > Sidebar.
- Pressing it opens the task form in a popover (`openPopover`).
  - On wide layouts the popover is next to the row.
  - On compact layouts Paseo shows it as a bottom sheet.
  - A click outside or Escape closes it.

### 2. Command Center: "New Scratchpad"

- Add an item with `addCommandCenterItem` (global context).
- Command Center items can not open a popover. This item opens the task form
  in the launcher screen.

### 3. The built-in "+" on the scratchpad project

- The app sends `workspace.create` with
  `source: { kind: "directory", path: <root>, projectId }`.
- A `server.before("workspace.create")` hook changes the request:
  - Condition: `source.kind === "directory"` and `source.path` is the root.
  - Make sure the project exists, and set `source.projectId` if it is missing.
  - Create a task directory without a name (`YYYY-MM-DD-HHMM`).
  - Set `source.path` to the new task directory.
  - Do not set `title`.
- Paths where the hook does not run are not supported. Examples:
  `paseo run --cwd <root>`, MCP `create_agent`. The README says so.

### Task form

One component, used in two places: the sidebar popover and the launcher
screen.

- It has one text field for the task name and a "Create" button.
  - The name is optional.
  - The field has focus when the form opens.
  - Enter creates the task.
- On create it calls the server RPC `createScratchTask({ name? })`, then asks
  its container to open the new workspace.
- The user writes the first prompt in the normal Paseo composer. Provider and
  model are chosen there, not by this plugin.
- The new workspace opens with Paseo's "New tab" panel and no agent. A
  plugin can not open Paseo's new-agent draft tab (Paseo 0.11.2 has no API
  for it). The form shows a short hint: press Cmd/Ctrl+Shift+A, or choose
  "New agent", to start an agent.
- The task is created on the host the form belongs to.

### Opening the new workspace

Only plugin screens get `navigation`. Popovers and sidebar items do not.

- Launcher screen: call `navigation.openWorkspace({ workspaceId })`.
- Popover: close the popover, then open the "open workspace" screen with
  `openScreen` and the workspace ID as a parameter. That screen calls
  `navigation.openWorkspace` once.

How Paseo 0.11.2 handles this history (read from the app code):

- `openScreen` pushes the screen.
- `openWorkspace` goes back to the nearest workspace route in the history
  and changes its workspace. All screens above it are removed, including
  the "open workspace" screen. If there is no workspace route, it pushes a
  new one.
- So when the user is in a workspace (the usual case), the "open workspace"
  screen does not stay in the history.
- When there was no workspace route (for example, the user started from the
  home screen), Back can return to the "open workspace" screen. The screen
  must not navigate again in that case. It shows a short message with a
  button that opens the workspace.

## Workspace title

| Path | Title |
|---|---|
| Launcher, with a name | The name as typed (before slug rules) |
| Launcher, without a name | Set later from the first agent |
| "+" with a prompt | Not set by the plugin. Paseo makes a title with an LLM |
| "+" without a prompt | Set later from the first agent |

"Set later from the first agent":

- Listen to the `agent.created` event.
- `agent.title` in the event is always `null`. Read the title with
  `paseo.agents.ref(agent.id).refresh()` instead.
- Set the workspace title to that agent title only if all of these are true:
  - The workspace belongs to the scratchpad project.
  - The workspace has no title yet.
  - The agent has no parent agent.
  - The agent title is not empty.
- The agent title is the first line of the first prompt (up to 60
  characters).
- Events are best effort. If the event is lost, the sidebar shows the
  directory name.

## Archive

When a task workspace is archived, the plugin moves its task directory into
`<root>/.archive/`.

```
${PASEO_HOME:-~/.paseo}/scratchpad/
├── 2026-10-11-1432/                       <- active task
└── .archive/
    └── 2026-10-11-csv-パーサ検証/          <- archived task
```

- Trigger: the `workspace.archived` event only.
- Move only if all of these are true:
  - The workspace belongs to the scratchpad project.
  - Its cwd is a task directory: a direct child of the root. The root itself
    and directories inside `.archive` are not moved.
  - No other active workspace uses the same directory.
  - The directory exists. If it does not exist, do nothing.
- The new path is `<root>/.archive/<directory name>`. If that path exists,
  add `-2`, `-3`, and so on.
- Create `.archive` when it is needed.
- Events are best effort. If the event is lost, the directory stays in the
  root. There is no sweep that moves directories later. Paseo can not list
  archived workspaces, so a sweep could move a directory that was just
  created and does not have its workspace yet.
- Errors are written to the plugin log.

After the move, Paseo's "Unarchive" for that workspace does not work,
because Paseo needs the directory at its old path. The README tells users
how to restore a task by hand:

1. Move the directory from `.archive/` back to the root, with the same name.
2. Open it in Paseo again. The exact way is checked in the end-to-end test.
   Candidates: "Unarchive" on the archived workspace page, or
   `paseo workspace create --isolation local --path <dir> --project <id>`.

## Things the plugin does not do

- It does not change agent settings (provider, model, mode, system prompt).
- It has no settings and no settings screen.
- It does not delete task directories.
- It has no UI to restore archived tasks.

## Errors

- Errors are returned to the caller. There are no fallbacks.
- If `mkdir` fails in the hook, the hook throws and the workspace is not
  created.
- If the root is inside a git repository, task creation fails with a clear
  message.

## Multiple hosts

Each Paseo host (daemon) has its own scratchpad. The plugin server and the
task directories are on that host.

## Code structure

```
paseo-plugin.json        id: paseo-scratch, name: Scratchpad
index.server.ts          wires server parts
index.client.tsx         wires client parts
shared/                  RPC contract (defineRpc + zod)
server/                  project setup, task creation, hooks, events
client/                  sidebar item, command center item, launcher screen
```

- Pure logic (root path, slug, task directory name, hook condition, title
  condition) is separate from Paseo calls and file system calls. It is tested
  with vitest.
- TypeScript. Follow the layout from `paseo plugin init`.
- Nix flake devShell provides Node.js.
- Install: `paseo plugin install github:1outres/paseo-scratch`.
- README is in English.

## Facts checked on a real daemon (Paseo 0.11.2)

1. Confirmed. When the `workspace.create` hook changes `source.path` to a
   subdirectory and keeps `source.projectId`:
   - the workspace is attached to the scratchpad project, and
   - the first agent starts in that subdirectory. The daemon moves the
     agent cwd along with the new `source.path`.
   - Without `projectId`, the daemon makes a new project for the
     subdirectory. The hook must set it.
2. Confirmed. Paseo still makes an LLM title from the first prompt. It came
   about 10 seconds after creation.
3. Confirmed by hand in the app. A plugin screen gets `navigation` with
   `openWorkspace`. Right after the screen creates a workspace (by a plugin
   RPC, or by `paseo.workspaces.create` changed by the hook),
   `navigation.openWorkspace` opens it.
4. `agent.created` has `workspaceId`, but `title` is `null`.
   `paseo.agents.ref(id).refresh()` returns the first-line title.
5. Confirmed. `paseo.workspaces.open(root)` on a new non-git directory makes a
   project. The project stays after its root workspace is archived.

Other facts found:

- The server context given to `contribute()` has no `paseo`. The SDK is
  only available inside hooks, event handlers and RPC handlers.
- The hook input for the app's request looks like
  `{ agent: { config, initialPrompt, clientMessageId, labels }, subscribe,
  idempotencyKey, firstAgentContext: { prompt }, source }`. Returning a copy
  with only `source` changed works.
- The hook also runs for the plugin's own `paseo.workspaces.create` calls.
  The "path is the root" check keeps those calls unchanged.
- Agents may write files in the task directory (for example, Claude writes
  `.claude/`). "Empty" only means the plugin writes nothing.
