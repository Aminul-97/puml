# Agents.md — PUML Project Guide

## Project purpose

PUML is a Chrome Manifest V3 extension that lets users write PlantUML source code and visualize the resulting UML diagram. The application opens in a full browser tab and has a responsive editor/preview interface.

## Product requirements

1. The extension's display name is **PUML**.
2. Provide a source-code editing experience and a rendered diagram preview.
3. Provide **Code** and **Diagram** tabs.
4. Support zoom in, zoom out, reset zoom to 100%, and fit-to-view.
5. Save source code locally between sessions.
6. Provide an editable example diagram and clear render-error feedback.
7. Keep the extension small, understandable, and dependency-free.

## Architecture

- `manifest.json`: Manifest V3 configuration and permissions.
- `service-worker.js`: opens the app in a full browser tab when the extension icon is clicked.
- `app.html`: semantic application markup.
- `styles.css`: layout, editor, tabs, zoom controls, responsive behavior.
- `app.js`: editor state, local persistence, rendering, error handling, and zoom.
- `README.md`: setup, usage, privacy, and troubleshooting instructions.

## Rendering contract

- The app sends the raw PlantUML source via HTTP POST to `https://kroki.io/plantuml/svg`.
- The expected response is SVG.
- The response must be displayed as an image/blob URL. Do not insert remote SVG text using `innerHTML` or otherwise treat renderer output as trusted HTML.
- If the endpoint changes, update `RENDER_ENDPOINT` in `app.js` and the corresponding `host_permissions` entry in `manifest.json`.
- Rendering requires network access. Do not claim the app is offline-capable.
- Warn users not to send confidential diagrams to a public renderer.

## Development rules for coding agents

- Preserve Manifest V3 compatibility.
- Prefer plain JavaScript, HTML, and CSS; do not add a framework or build system unless explicitly requested.
- Do not add permissions without a clear feature requirement.
- Keep source code in `chrome.storage.local`; do not add analytics, tracking, or remote persistence.
- Keep UI strings accessible and controls keyboard-operable.
- Keep zoom bounded between 25% and 300%.
- Avoid injecting untrusted SVG or server output into the DOM as markup.
- Maintain clear loading, success, empty, and error states.
- Ensure repeated render requests cannot overwrite a newer result with a stale response.
- Do not commit API keys, secrets, credentials, or personal data.
- Update `README.md` when installation, permissions, rendering, or user-facing behavior changes.

## Manual verification checklist

1. Load the folder using `chrome://extensions` → **Developer mode** → **Load unpacked**.
2. Click the PUML toolbar icon and confirm the app opens in a browser tab.
3. Confirm the sample source appears and can be edited.
4. Render the sample and confirm an SVG diagram appears.
5. Verify Code/Diagram tab selection.
6. Verify zoom controls, reset, and Fit.
7. Enter invalid syntax and confirm a helpful error is displayed.
8. Edit the source, close/reopen PUML, and confirm the draft persists.
9. Test at narrow and wide window widths.
10. Verify the extension requests only the permissions listed in `manifest.json`.

## Known limitations

- Rendering uses the public Kroki service and requires internet access.
- Diagram source is transmitted to Kroki on render.
- The editor is a lightweight textarea, not a full syntax-highlighting IDE.
- This is a local developer build; publishing to the Chrome Web Store requires appropriate icons, listing assets, privacy disclosures, and review.
