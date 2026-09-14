# etf.sh
etf.sh website

## Running locally

This is a static site, but `commands.json` and `boot.json` are loaded via `fetch`, so it needs to be served over http — opening `index.html` directly (`file://`) won't load custom commands or the boot sequence.

```
python3 -m http.server 8000
```

Then open http://localhost:8000/ in your browser.

## Adding commands

Most commands are plain informational output and belong in `commands.json`:

```json
"mycommand": {
  "description": "shown in help",
  "lines": ["plain text", { "label": "site", "text": "example.com", "url": "https://example.com" }]
}
```

A command can also jump straight to a link in a new tab instead of printing output — use `url` in place of `lines`:

```json
"mycommand": {
  "description": "shown in help",
  "url": "https://example.com"
}
```

Commands that need actual logic (like `theme`) go in `SYSTEM_COMMANDS` in `commands.js`.

## Boot sequence

On page load, a fake kernel boot log plays from `boot.json` (a list of `{ "text": ..., "delay": <ms> }` lines) before the prompt appears — currently timed to run about 5 seconds. Pressing any key or clicking during it skips straight to the prompt. Edit `boot.json` to change the log or its timing.
