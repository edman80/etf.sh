(function () {
  const output = document.getElementById("output");
  const input = document.getElementById("input");
  const inputLine = document.querySelector(".input-line");
  const terminal = document.getElementById("terminal");

  const THEME_KEY = "etf.sh:theme";
  const HISTORY_KEY = "etf.sh:history";

  window.COMMANDS = {};

  function getTheme() {
    return localStorage.getItem(THEME_KEY) || "system";
  }

  function setTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
    applyTheme();
  }

  function applyTheme() {
    const theme = getTheme();
    if (theme === "system") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }

  // Exposed for commands.js
  window.getTheme = getTheme;
  window.setTheme = setTheme;

  applyTheme();

  let history = [];
  try {
    history = JSON.parse(sessionStorage.getItem(HISTORY_KEY)) || [];
  } catch (e) {
    history = [];
  }
  let historyIndex = history.length;

  function saveHistory() {
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }

  function scrollToBottom() {
    window.scrollTo(0, document.body.scrollHeight);
  }

  function appendLine(html, className) {
    const div = document.createElement("div");
    div.className = "line" + (className ? " " + className : "");
    div.innerHTML = html || "&nbsp;";
    output.appendChild(div);
    scrollToBottom();
  }

  function appendCommandEcho(promptText, typed) {
    const div = document.createElement("div");
    div.className = "line cmd-line";
    const promptSpan = document.createElement("span");
    promptSpan.className = "prompt";
    promptSpan.textContent = promptText;
    const typedSpan = document.createElement("span");
    typedSpan.className = "typed";
    typedSpan.textContent = typed;
    div.appendChild(promptSpan);
    div.appendChild(typedSpan);
    output.appendChild(div);
    scrollToBottom();
  }

  function getPromptText() {
    return "guest@etf.sh:~$";
  }

  function renderResult(result) {
    if (result == null) return;

    if (typeof result === "object" && !Array.isArray(result)) {
      if (result.clear) {
        output.innerHTML = "";
        return;
      }
      if (result.error) {
        appendLine(escapeHtml(result.error), "error");
        return;
      }
    }

    const lines = Array.isArray(result) ? result : String(result).split("\n");
    lines.forEach((line) => appendLine(line));
  }

  function runCommand(raw) {
    const trimmed = raw.trim();
    appendCommandEcho(getPromptText(), raw);

    if (!trimmed) return;

    history.push(raw);
    historyIndex = history.length;
    saveHistory();

    const [name, ...args] = trimmed.split(/\s+/);
    const command = COMMANDS[name.toLowerCase()];

    if (!command) {
      appendLine(
        `command not found: ${escapeHtml(name)} (type ${escapeHtml("help")} for a list of commands)`,
        "error"
      );
      return;
    }

    try {
      const result = command.run(args);
      renderResult(result);
    } catch (e) {
      appendLine(`error running ${escapeHtml(name)}: ${escapeHtml(e.message)}`, "error");
    }
  }

  function sizeInput() {
    input.style.width = input.value.length + "ch";
  }

  function setInputValue(value) {
    input.value = value;
    sizeInput();
    moveCursorToEnd();
  }

  input.addEventListener("input", sizeInput);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const value = input.value;
      setInputValue("");
      runCommand(value);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (historyIndex > 0) {
        historyIndex -= 1;
        setInputValue(history[historyIndex] || "");
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex < history.length) {
        historyIndex += 1;
        setInputValue(history[historyIndex] || "");
      }
    }
  });

  function moveCursorToEnd() {
    requestAnimationFrame(() => {
      input.selectionStart = input.selectionEnd = input.value.length;
    });
  }

  input.addEventListener("focus", () => inputLine.classList.remove("blurred"));
  input.addEventListener("blur", () => inputLine.classList.add("blurred"));

  terminal.addEventListener("click", (e) => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;
    input.focus();
  });

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function loadBootLines() {
    try {
      const res = await fetch("boot.json");
      return await res.json();
    } catch (e) {
      console.error("failed to load boot.json:", e);
      return [];
    }
  }

  // Plays the boot log a line at a time. Pressing a key or clicking flushes
  // the rest of the log immediately instead of waiting out the delays.
  async function playBootSequence(lines) {
    let skip = false;
    const onSkip = () => { skip = true; };
    window.addEventListener("keydown", onSkip);
    window.addEventListener("mousedown", onSkip);

    for (const line of lines) {
      appendLine(escapeHtml(line.text), "dim");
      if (!skip) await sleep(line.delay);
    }

    window.removeEventListener("keydown", onSkip);
    window.removeEventListener("mousedown", onSkip);
  }

  async function init() {
    input.disabled = true;
    inputLine.style.display = "none";

    const [custom, bootLines] = await Promise.all([loadCustomCommands(), loadBootLines()]);
    Object.assign(COMMANDS, custom, SYSTEM_COMMANDS);

    await playBootSequence(bootLines);
    output.innerHTML = "";

    appendLine(`Welcome to etf.sh. Type <strong>help</strong> to see available commands.`);
    inputLine.style.display = "";
    input.disabled = false;
    sizeInput();
    input.focus();
  }

  init();
})();
