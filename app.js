const DEFAULT_SOURCE = `@startuml
title Simple class diagram

class User {
  +id: int
  +name: string
  +login()
}

class Project {
  +name: string
  +createDiagram()
}

User "1" --> "*" Project : owns
@enduml`;

const STORAGE_KEY = "puml-source";
const RENDER_ENDPOINT = "https://kroki.io/plantuml/svg";
const DEBOUNCE_MS = 600;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

const sourceEditor = document.querySelector("#source-code");
const lineNumbers = document.querySelector("#line-numbers");
const lineCount = document.querySelector("#line-count");
const saveStatus = document.querySelector("#save-status");
const codeTab = document.querySelector("#code-tab");
const diagramTab = document.querySelector("#diagram-tab");
const emptyState = document.querySelector("#empty-state");
const loadingState = document.querySelector("#loading-state");
const errorState = document.querySelector("#error-state");
const errorMessage = document.querySelector("#error-message");
const diagramViewport = document.querySelector("#diagram-viewport");
const diagramStage = document.querySelector("#diagram-stage");
const diagramImage = document.querySelector("#diagram-image");
const previewDescription = document.querySelector("#preview-description");
const renderStatus = document.querySelector("#render-status");

let zoom = 1;
let renderTimer = null;
let renderRequestId = 0;
let currentObjectUrl = null;
let lastRenderedSource = "";

let panX = 0;
let panY = 0;
let isPanning = false;
let startX = 0;
let startY = 0;

function updateEditorMeta() {
  const lines = sourceEditor.value.split("\n").length;
  lineNumbers.textContent = Array.from({ length: lines }, (_, index) => index + 1).join("\n");
  lineCount.textContent = `${lines} ${lines === 1 ? "line" : "lines"}`;
}

function updateTransform() {
  diagramImage.style.transform = `translate(${Math.round(panX)}px, ${Math.round(panY)}px)`;
}

function setTab(tab) {
  const showDiagram = tab === "diagram";
  codeTab.classList.toggle("active", !showDiagram);
  diagramTab.classList.toggle("active", showDiagram);
  codeTab.setAttribute("aria-selected", String(!showDiagram));
  diagramTab.setAttribute("aria-selected", String(showDiagram));
  document.querySelector(".workspace").classList.toggle("diagram-mode", showDiagram);

  if (showDiagram) {
    if (!lastRenderedSource && sourceEditor.value.trim()) {
      renderDiagram();
    } else if (!diagramViewport.hidden) {
      fitDiagram();
    }
  }
}

function setPreviewState(state) {
  emptyState.hidden = state !== "empty";
  loadingState.hidden = state !== "loading";
  errorState.hidden = state !== "error";
  diagramViewport.hidden = state !== "diagram";
}

function setZoom(nextZoom) {
  zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
  if (diagramImage.naturalWidth && diagramImage.naturalHeight) {
    diagramImage.style.width = `${Math.round(diagramImage.naturalWidth * zoom)}px`;
    diagramImage.style.height = `${Math.round(diagramImage.naturalHeight * zoom)}px`;
  }
  document.querySelector("#zoom-reset").textContent = `${Math.round(zoom * 100)}%`;
  updateTransform();
}

function fitDiagram() {
  if (!diagramImage.naturalWidth || !diagramImage.naturalHeight) return;
  const availableWidth = Math.max(100, diagramViewport.clientWidth - 48);
  const availableHeight = Math.max(100, diagramViewport.clientHeight - 48);
  const fitZoom = Math.min(1, availableWidth / diagramImage.naturalWidth, availableHeight / diagramImage.naturalHeight);
  panX = 0;
  panY = 0;
  setZoom(fitZoom);
}

async function loadSavedSource() {
  try {
    const saved = await chrome.storage.local.get(STORAGE_KEY);
    sourceEditor.value = typeof saved[STORAGE_KEY] === "string" ? saved[STORAGE_KEY] : DEFAULT_SOURCE;
  } catch (error) {
    sourceEditor.value = DEFAULT_SOURCE;
    saveStatus.textContent = "Local storage unavailable";
  }
  updateEditorMeta();
}

async function saveSource() {
  saveStatus.textContent = "Saving…";
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: sourceEditor.value });
    saveStatus.textContent = "Saved locally";
  } catch (error) {
    saveStatus.textContent = "Couldn't save";
  }
}

function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => renderDiagram({ switchTab: false }), DEBOUNCE_MS);
}

async function renderDiagram({ switchTab = false } = {}) {
  const source = sourceEditor.value.trim();
  if (!source) {
    setPreviewState("empty");
    previewDescription.textContent = "Your rendered UML diagram will appear here.";
    renderStatus.textContent = "No diagram source";
    return;
  }

  const requestId = ++renderRequestId;
  setPreviewState("loading");
  previewDescription.textContent = "Sending source to the renderer…";
  renderStatus.textContent = "Rendering…";
  if (switchTab) setTab("diagram");

  try {
    // Kroki accepts raw PlantUML source via POST and returns an SVG image.
    const response = await fetch(RENDER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain; charset=utf-8", "Accept": "image/svg+xml" },
      body: source
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(detail.trim().slice(0, 300) || `Renderer returned HTTP ${response.status}.`);
    }

    const svgText = await response.text();
    if (!svgText.includes("<svg") || /<parsererror/i.test(svgText)) {
      throw new Error("The renderer did not return a valid SVG diagram. Check your PlantUML syntax.");
    }
    if (requestId !== renderRequestId) return;

    // Display SVG as an image, never inject server-provided markup into the page.
    const blob = new Blob([svgText], { type: "image/svg+xml" });
    const objectUrl = URL.createObjectURL(blob);
    const previousUrl = currentObjectUrl;
    currentObjectUrl = objectUrl;

    diagramImage.onload = () => {
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      if (requestId !== renderRequestId) return;
      setPreviewState("diagram");
      previewDescription.textContent = "Diagram rendered successfully.";
      renderStatus.textContent = `Rendered ${new Date().toLocaleTimeString()}`;
      if (!lastRenderedSource) {
        fitDiagram();
      } else {
        setZoom(zoom);
      }
      lastRenderedSource = source;
    };

    diagramImage.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      if (currentObjectUrl === objectUrl) currentObjectUrl = null;
      if (requestId === renderRequestId) {
        setPreviewState("error");
        errorMessage.textContent = "The returned SVG could not be displayed. Try rendering again.";
      }
    };

    diagramImage.src = objectUrl;
  } catch (error) {
    if (requestId !== renderRequestId) return;
    setPreviewState("error");
    const message = error instanceof Error ? error.message : "Unknown rendering error.";
    errorMessage.textContent = message.includes("Failed to fetch")
      ? "Could not reach Kroki. Check your internet connection, then try again."
      : message;
    previewDescription.textContent = "Rendering failed.";
    renderStatus.textContent = "Render failed";
  }
}

// Editor input events
sourceEditor.addEventListener("input", () => {
  updateEditorMeta();
  saveSource();
  scheduleRender();
});
sourceEditor.addEventListener("scroll", () => { lineNumbers.scrollTop = sourceEditor.scrollTop; });
sourceEditor.addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    event.preventDefault();
    const start = sourceEditor.selectionStart;
    const end = sourceEditor.selectionEnd;
    sourceEditor.setRangeText("  ", start, end, "end");
  }
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    renderDiagram();
  }
});

// Viewport panning / moving with hand cursor
diagramViewport.addEventListener("mousedown", (event) => {
  if (event.button !== 0) return;
  isPanning = true;
  diagramViewport.classList.add("is-panning");
  startX = event.clientX - panX;
  startY = event.clientY - panY;
  event.preventDefault();
});

window.addEventListener("mousemove", (event) => {
  if (!isPanning) return;
  event.preventDefault();
  panX = event.clientX - startX;
  panY = event.clientY - startY;
  updateTransform();
});

window.addEventListener("mouseup", () => {
  if (isPanning) {
    isPanning = false;
    diagramViewport.classList.remove("is-panning");
  }
});

window.addEventListener("blur", () => {
  if (isPanning) {
    isPanning = false;
    diagramViewport.classList.remove("is-panning");
  }
});

diagramViewport.addEventListener("wheel", (event) => {
  event.preventDefault();
  if (event.ctrlKey || event.metaKey) {
    const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
    setZoom(zoom * zoomFactor);
  } else {
    panX -= event.deltaX;
    panY -= event.deltaY;
    updateTransform();
  }
}, { passive: false });

diagramImage.addEventListener("dragstart", (event) => event.preventDefault());

// Tabs and zoom buttons
codeTab.addEventListener("click", () => setTab("code"));
diagramTab.addEventListener("click", () => setTab("diagram"));
document.querySelector("#zoom-in").addEventListener("click", () => setZoom(zoom + ZOOM_STEP));
document.querySelector("#zoom-out").addEventListener("click", () => setZoom(zoom - ZOOM_STEP));
document.querySelector("#zoom-reset").addEventListener("click", () => {
  panX = 0;
  panY = 0;
  setZoom(1);
});
document.querySelector("#fit-button").addEventListener("click", fitDiagram);
document.querySelector("#retry-button").addEventListener("click", () => renderDiagram());
window.addEventListener("resize", () => { if (!diagramViewport.hidden) fitDiagram(); });
window.addEventListener("beforeunload", () => {
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
});

// Load saved source, set default view to Code tab, and auto-render in background
loadSavedSource().then(() => {
  setTab("code");
  renderDiagram({ switchTab: false });
});
