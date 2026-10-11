Scratchpad gives you a quick place for tasks that do not belong to any code
directory, such as one-off scripts, small experiments, research, and writing.

Every task gets a new, empty directory under `<Paseo home>/scratchpad` and its
own workspace in a non-git project called `scratchpad`. The project and its
directory are made when the app loads the plugin, and again before each new task
if they are missing.

Start a task in one of three ways:

- The "New Scratchpad" row at the top of the sidebar.
- "New Scratchpad" in the Command Center.
- The "+" button on the `scratchpad` project.

The sidebar row opens a small popup with an optional task name. The Command
Center item opens the same form on a screen. A named task uses
a directory like `2026-10-11-csv-parser` and the name as its workspace title. A
task without a name uses a directory like `2026-10-11-1432` and takes its title
from the first prompt. The workspace opens without an agent: press
Cmd/Ctrl+Shift+A or choose "New agent", then pick the provider and model in the
normal composer. Directory names are never reused, also after a task is
archived.

Directories use the local time of the daemon host. The plugin never deletes task
directories. When you archive a task workspace, its directory moves into
`scratchpad/.archive/`. After that, Paseo's "Unarchive" does not work for it; move
the directory back by hand to restore it. The plugin does not change agent settings.
If the Paseo home is inside a git repository, the plugin refuses to work.

Workspaces made with `paseo run --cwd` or MCP `create_agent` on the scratchpad
root do not get a task directory.

Requires Paseo 0.11.2 or later.
