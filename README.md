# etf.sh
etf.sh website

## Running locally

This is a static site, but `commands.json` is loaded via `fetch`, so it needs to be served over http — opening `index.html` directly (`file://`) won't load custom commands.

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

Commands that need actual logic (like `theme`) go in `SYSTEM_COMMANDS` in `commands.js`.
