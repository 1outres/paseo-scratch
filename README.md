# paseo-scratch

A [Paseo](https://paseo.sh) plugin for small tasks that do not belong to any code
directory, such as one-off scripts, small experiments, research, and writing.
The plugin does not limit the kind of task.

All of these tasks live in one Paseo project called `scratchpad`. Each task gets
its own new, empty directory and its own workspace.

Requires Paseo 0.11.2 or later.

## Install

```bash
paseo plugin install github:1outres/paseo-scratch
```

Plugins must be turned on for the daemon (Settings > Plugins).

## How to start a task

There are three ways. All of them make a new task directory and a new workspace
in the `scratchpad` project.

1. **Sidebar: "New Scratchpad".** A row in the top part of the sidebar. It opens
   the task form in a small popup next to the row (a sheet from the bottom on
   phones and narrow windows). Click outside or press Escape to close it. You
   can move or hide the row in Settings > Sidebar.
2. **Command Center: "New Scratchpad".** Open the Command Center (Cmd+K or
   Ctrl+K) and pick "New Scratchpad". It opens the same task form on its own
   screen.
3. **The "+" button on the `scratchpad` project.** The plugin changes the
   request so the new workspace uses a new task directory instead of the
   project root.

### The task form

- Type a task name and press Enter or "Create". The name is optional.
- The workspace opens with Paseo's "New tab" panel and no agent. To start an
  agent, press Cmd/Ctrl+Shift+A (browser and desktop app) or choose "New agent".
  The form shows this hint too. Write the first prompt in the normal Paseo
  composer. You choose the provider and model there.
- With a name, the workspace title is the name you typed.
- Without a name, the workspace gets the title of its first agent (the first
  line of the first prompt).
- If the name has no letters or digits that can be used in a directory name
  (for example `???`), the form shows an error.
- From the sidebar popup, the plugin opens the workspace through a short
  "New Scratchpad" screen. If you go Back to that screen later, it does not open
  the workspace again. It shows an "Open workspace" button instead.

### Workspace titles from "+"

- If you write a prompt with "+", Paseo makes the title itself.
- If you do not, the workspace gets the title of its first agent.

## Where files live

```
${PASEO_HOME:-~/.paseo}/scratchpad/
├── 2026-10-11-csv-パーサ検証/    <- task with a name
├── 2026-10-11-1432/              <- task without a name
└── .archive/                     <- archived tasks
```

- The root is `<Paseo home>/scratchpad`. The Paseo home is `PASEO_HOME`, or
  `~/.paseo` when it is not set. There is no setting to change it.
- A task directory name is `YYYY-MM-DD-<name>` or `YYYY-MM-DD-HHMM`, in the local
  time of the daemon host. If the name is already used in the root or in
  `.archive/`, `-2`, `-3`, and so on are added. A name is never used twice, so an
  archived task can always move back to the root with its own name.
- The plugin does not run `git init` and writes nothing into a task directory.
- The plugin never deletes task directories. When you archive a task workspace,
  its directory moves into `.archive/` (see "Archive" below).
- If the root is inside a git repository, the plugin stops with an error.
- Each Paseo host (daemon) has its own scratchpad on that host.

The plugin makes sure the root directory and the `scratchpad` project exist when
the app loads the plugin, and again before each new task. If you delete the
project or the root directory, they come back at the next of these times. If
this fails when the app loads the plugin, the error is in the plugin log
(Settings > Plugins > Logs, or `paseo plugin logs paseo-scratch`).

## Archive

When you archive a task workspace, the plugin moves its directory from the root
into `<root>/.archive/`, with the same name. If that name is already used in
`.archive`, it adds `-2`, `-3`, and so on.

The plugin moves the directory only when all of these are true:

- The workspace is in the `scratchpad` project.
- Its directory is directly in the root (not the root itself, and not in
  `.archive`).
- No other active workspace uses the same directory.
- The directory still exists.

The move happens when Paseo reports the archive. If the plugin does not get that
event (for example, the plugin is not running), the directory stays in the root.
The plugin does not move it later. Errors are written to the plugin log
(Settings > Plugins > Logs, or `paseo plugin logs paseo-scratch`).

### Restore an archived task

After the move, Paseo's "Unarchive" does not work for that workspace, because
Paseo looks for the directory at its old path. The plugin has no restore button.
To restore a task by hand:

1. Move the directory from `<root>/.archive/` back to `<root>/`, with its old
   name. If the move added a `-2` style suffix, remove it.
2. In Paseo, open the archived workspace and press "Unarchive". The workspace
   comes back with the same title.
3. Its agents stay archived. To use an agent again, open it and press
   "Unarchive".

Do not use `paseo workspace create --path <dir>` for this. It makes a new, empty
workspace, and the old agents are not in it.

## Not supported

The plugin only sees workspaces created through the "+" button and the
launcher. These ways skip it, so they do not make a task directory:

- `paseo run --cwd <root>`
- MCP `create_agent` with the root as its directory

## Development

The repository has a Nix flake with Node.js.

```bash
nix develop -c npm install
nix develop -c npm test
nix develop -c npm run typecheck
```

Layout:

- `shared/`: the RPC contract and task name rules, used by both sides.
- `server/`: runs in the daemon. `domain/` has pure logic, `services/` uses it
  through the interfaces in `ports/`, and `adapters/` connect those interfaces to
  Node.js and the Paseo SDK.
- `client/`: the task form, the sidebar row and its popup, the launcher
  screen, and the screen that opens a new workspace.
