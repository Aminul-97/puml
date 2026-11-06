# PUML — PlantUML Viewer for Chrome

PUML is a Manifest V3 Chrome extension for editing PlantUML source and visualizing diagrams in a browser tab.

## Features

- Code editor with line numbers and Tab indentation.
- Code and Diagram tabs.
- Automatic live rendering while editing code (600 ms debounce).
- Zoom in, zoom out, reset zoom, fit-to-view, and hand-cursor click-and-drag panning.
- Light and dark themes with a topbar switcher and preference persistence.
- Locally saved source using `chrome.storage.local`.
- Sample class diagram.
- Helpful rendering error states.
- SVG is displayed using an image blob rather than inserted into the page as HTML.

## Install locally (developer mode)

1. Download and extract `PUML.zip`.
2. Open Chrome and navigate to `chrome://extensions`.
3. Turn on **Developer mode**.
4. Select **Load unpacked**.
5. Choose the extracted `PUML` folder containing `manifest.json`.
6. Click the PUML extension icon to open the app in a browser tab.

After changing extension files, click **Reload** on the extension card at `chrome://extensions`.

## How to use

1. Open PUML from the Chrome toolbar.
2. Edit the PlantUML source in the left panel.
3. The UML diagram automatically renders as you edit the source.
4. Use **Code** and **Diagram** tabs to switch views.
5. Use `+`, `−`, the percentage button, and **Fit** to control zoom, or click and drag with the hand cursor to pan.
6. Press `Ctrl+Enter` (Windows/Linux) or `⌘+Enter` (macOS) in the editor to render immediately.
7. Use the theme switcher in the top bar to switch between Light and Dark themes.

## Rendering and privacy

PUML sends the current PlantUML source to the public Kroki service at `https://kroki.io/plantuml/svg` when rendering. An internet connection is required. Do not use this public service for confidential or sensitive diagrams. The source editor and saved draft remain in the browser's local extension storage; source is not sent until a render is triggered.

For private or offline usage, host a trusted Kroki/PlantUML renderer and update `RENDER_ENDPOINT` in `app.js` and `host_permissions` in `manifest.json`.

## Project structure

```text
PUML/
├── manifest.json
├── service-worker.js
├── app.html
├── styles.css
├── app.js
├── README.md
└── Agents.md
```

## Troubleshooting

- **Could not reach Kroki:** Check internet access and whether the service is reachable.
- **Syntax/render error:** Check `@startuml` and `@enduml`, class names, arrows, and other PlantUML syntax.
- **Extension changes do not appear:** Reload PUML from `chrome://extensions` and reopen its tab.
- **Unexpected SVG issue:** The renderer response is validated before it is displayed.

## Permissions

- `storage`: saves the user's draft locally.
- `https://kroki.io/*`: allows the extension to send PlantUML source to Kroki and receive the rendered SVG.
