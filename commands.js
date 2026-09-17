// Command registry for the terminal.
//
// There are two ways to add a command:
//
// 1. Plain informational output (the common case) -> edit commands.json.
//    Add an entry keyed by the command name:
//
//      "mycommand": {
//        "description": "shown in `help` output",
//        "lines": [
//          "a plain line of text",
//          { "label": "site", "text": "example.com", "url": "https://example.com" }
//        ]
//      }
//
//    `lines` items are either plain strings, or { label, text, url } objects
//    which render as an aligned "label   text" row (text becomes a link when
//    `url` is present).
//
//    To make a command jump straight to a link in a new tab instead of
//    printing output, use `url` in place of `lines`:
//
//      "mycommand": {
//        "description": "shown in `help` output",
//        "url": "https://example.com"
//      }
//
// 2. Commands that need actual logic (like `theme` or `date`) -> add to
//    SYSTEM_COMMANDS below:
//
//      mycommand: {
//        description: "shown in `help` output",
//        category: "system",
//        run: (args) => "a string, an array of strings, or HTML via link()"
//      }

function link(text, url) {
  return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderJsonLines(lines) {
  const labelWidth = Math.max(
    0,
    ...lines.filter((l) => l && typeof l === "object" && l.label).map((l) => l.label.length)
  );

  return lines.map((line) => {
    if (typeof line === "string") return escapeHtml(line);
    const label = escapeHtml(line.label).padEnd(labelWidth + 2);
    const value = line.url ? link(line.text, line.url) : escapeHtml(line.text);
    return `${label}${value}`;
  });
}

function buildJsonCommand(entry) {
  if (entry.url) {
    return {
      description: entry.description || "",
      category: "custom",
      run: () => {
        window.open(entry.url, "_blank", "noopener,noreferrer");
        return `opening ${link(entry.url, entry.url)} in a new tab...`;
      },
    };
  }

  return {
    description: entry.description || "",
    category: "custom",
    run: () => renderJsonLines(entry.lines || []),
  };
}

// Fetches commands.json and returns a { name: command } map.
// Falls back to an empty map (with a warning line) if it can't be loaded,
// e.g. when the page is opened via file:// instead of being served over http.
async function loadCustomCommands() {
  try {
    const res = await fetch("commands.json");
    const data = await res.json();
    const commands = {};
    Object.keys(data).forEach((name) => {
      commands[name] = buildJsonCommand(data[name]);
    });
    return commands;
  } catch (e) {
    console.error("failed to load commands.json:", e);
    return {
      _commandsLoadError: {
        description: "",
        category: "custom",
        run: () => ({ error: "couldn't load commands.json (serve this site over http, not file://)" }),
        hidden: true,
      },
    };
  }
}

const SYSTEM_COMMANDS = {
  help: {
    description: "list available commands",
    category: "system",
    run: () => {
      const groups = [
        { title: "commands", match: (c) => c.category !== "system" },
        { title: "system utilities", match: (c) => c.category === "system" },
      ];

      const lines = [];
      groups.forEach((group) => {
        const names = Object.keys(COMMANDS)
          .filter((n) => group.match(COMMANDS[n]) && !COMMANDS[n].hidden)
          .sort();
        if (names.length === 0) return;
        if (lines.length > 0) lines.push("");
        const width = Math.max(...names.map((n) => n.length));
        lines.push(`${group.title}:`);
        names.forEach((n) => lines.push(`  ${n.padEnd(width + 2)}${COMMANDS[n].description}`));
      });
      return lines;
    },
  },

  theme: {
    description: "theme [light|dark|system] - view or set color theme",
    category: "system",
    run: (args) => {
      const choice = (args[0] || "").toLowerCase();
      if (!choice) {
        return `current theme: ${getTheme()} (usage: theme [light|dark|system])`;
      }
      if (!["light", "dark", "system"].includes(choice)) {
        return { error: `unknown theme "${choice}" (expected light, dark, or system)` };
      }
      setTheme(choice);
      return `theme set to ${choice}`;
    },
  },

  clear: {
    description: "clear the screen",
    category: "system",
    run: () => ({ clear: true }),
  },

  whoami: {
    description: "print the current user",
    category: "system",
    run: () => "guest",
  },

  date: {
    description: "print the current date and time",
    category: "system",
    run: () => new Date().toString(),
  },

  sitecount: {
    description: "print the current site visit count",
    category: "system",
    run: async () => {
      try {
        const res = await fetch(`${window.COUNTER_BASE}/count`);
        const text = (await res.text()).trim();
        let count = text;
        try {
          const data = JSON.parse(text);
          count = typeof data === "object" ? data.count : data;
        } catch (e) {
          // response wasn't JSON, use the raw text
        }
        return `site count: ${count}`;
      } catch (e) {
        return { error: "couldn't reach the site counter" };
      }
    },
  },
};

window.SYSTEM_COMMANDS = SYSTEM_COMMANDS;
window.loadCustomCommands = loadCustomCommands;
