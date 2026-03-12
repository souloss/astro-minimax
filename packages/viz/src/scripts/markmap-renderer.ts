type MarkmapView = {
  Markmap: {
    create: (svg: SVGElement, opts: Record<string, unknown>, root: unknown) => MarkmapInstance;
  };
};

type MarkmapLib = {
  Transformer: new () => {
    transform: (content: string) => { root: unknown };
  };
};

type MarkmapInstance = {
  setData: (root: unknown) => void;
  setOptions: (opts: Record<string, unknown>) => void;
  fit: () => void;
};

let markmapViewModule: MarkmapView | null = null;
let markmapLibModule: MarkmapLib | null = null;

async function loadMarkmapModules(): Promise<{ view: MarkmapView; lib: MarkmapLib }> {
  if (markmapViewModule && markmapLibModule) {
    return { view: markmapViewModule, lib: markmapLibModule };
  }
  const [view, lib] = await Promise.all([
    // @ts-ignore CDN dynamic import
    import("https://cdn.jsdelivr.net/npm/markmap-view@0.18.10/+esm") as Promise<MarkmapView>,
    // @ts-ignore CDN dynamic import
    import("https://cdn.jsdelivr.net/npm/markmap-lib@0.18.10/+esm") as Promise<MarkmapLib>,
  ]);
  markmapViewModule = view;
  markmapLibModule = lib;
  return { view, lib };
}

function getThemeColors() {
  const style = getComputedStyle(document.documentElement);
  return {
    foreground: style.getPropertyValue("--foreground").trim(),
    accent: style.getPropertyValue("--accent").trim(),
    background: style.getPropertyValue("--background").trim(),
    foregroundSoft: style.getPropertyValue("--foreground-soft").trim(),
  };
}

function getMarkmapOptions() {
  const colors = getThemeColors();
  return {
    color: () => colors.accent || "#3b82f6",
    nodeMinHeight: 16,
    paddingX: 16,
    spacingHorizontal: 80,
    spacingVertical: 5,
    autoFit: true,
  };
}

const instanceMap = new Map<string, MarkmapInstance>();

async function renderMarkmap(wrapper: HTMLElement) {
  const id = wrapper.getAttribute("data-markmap-id");
  const contentScript = wrapper.querySelector("script.markmap-content");
  const svg = wrapper.querySelector<SVGElement>(`#${id}-svg`);
  const placeholder = wrapper.querySelector<HTMLElement>(".markmap-placeholder");

  if (!svg || !contentScript || !id) return;

  const content = JSON.parse(contentScript.textContent || '""');
  if (!content) return;

  try {
    const { view, lib } = await loadMarkmapModules();
    const transformer = new lib.Transformer();
    const { root } = transformer.transform(content);
    const opts = getMarkmapOptions();

    svg.innerHTML = "";
    const instance = view.Markmap.create(svg, opts, root);
    instanceMap.set(id, instance);
    applyThemeToSvg(svg);

    if (placeholder) placeholder.style.display = "none";
  } catch (error) {
    svg.innerHTML = "";
    const errorEl = document.createElement("div");
    errorEl.className = "markmap-error";
    errorEl.textContent = `Render error: ${error instanceof Error ? error.message : "unknown"}`;
    wrapper.appendChild(errorEl);
    if (placeholder) placeholder.style.display = "none";
  }
}

function buildVizShell(): { container: HTMLElement; viewport: HTMLElement } {
  const container = document.createElement("div");
  container.className = "viz-container group relative my-6 overflow-hidden rounded-lg border";
  container.style.minHeight = "200px";
  container.dataset.vizZoom = "true";
  container.dataset.vizFullscreen = "true";

  const viewport = document.createElement("div");
  viewport.className = "viz-viewport w-full origin-center";
  viewport.style.transform = "scale(1) translate(0px, 0px)";

  const controls = document.createElement("div");
  controls.className = "viz-controls absolute right-2 bottom-2 z-10 flex items-center gap-1 rounded-lg border border-[var(--viz-border)] bg-[var(--viz-btn-bg)] p-1 opacity-0 shadow-sm backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100";
  controls.innerHTML = `
    <button class="viz-btn viz-zoom-in flex size-7 items-center justify-center rounded-md text-foreground-soft transition-colors hover:bg-[var(--viz-btn-hover)] hover:text-accent" aria-label="Zoom in"><svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
    <button class="viz-btn viz-zoom-out flex size-7 items-center justify-center rounded-md text-foreground-soft transition-colors hover:bg-[var(--viz-btn-hover)] hover:text-accent" aria-label="Zoom out"><svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
    <button class="viz-btn viz-reset flex size-7 items-center justify-center rounded-md text-foreground-soft transition-colors hover:bg-[var(--viz-btn-hover)] hover:text-accent" aria-label="Reset view"><svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
    <div class="mx-0.5 h-4 w-px bg-[var(--viz-border)]"></div>
    <button class="viz-btn viz-fullscreen flex size-7 items-center justify-center rounded-md text-foreground-soft transition-colors hover:bg-[var(--viz-btn-hover)] hover:text-accent" aria-label="Toggle fullscreen"><svg class="viz-fs-enter size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg><svg class="viz-fs-exit hidden size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg></button>
  `;
  container.appendChild(viewport);
  container.appendChild(controls);
  return { container, viewport };
}

async function renderPreBlock(pre: HTMLElement) {
  const content = pre.textContent || "";
  const uid = `markmap-pre-${Math.random().toString(36).slice(2, 11)}`;

  const { container: vizContainer, viewport } = buildVizShell();

  const wrapper = document.createElement("div");
  wrapper.className = "markmap-wrapper";
  wrapper.setAttribute("data-markmap-id", uid);
  wrapper.setAttribute("data-viz-type", "markmap");

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.id = `${uid}-svg`;
  svg.classList.add("markmap-svg");
  svg.style.width = "100%";
  svg.style.minHeight = "200px";

  const contentScript = document.createElement("script");
  contentScript.type = "application/json";
  contentScript.className = "markmap-content";
  contentScript.textContent = JSON.stringify(content);

  wrapper.appendChild(svg);
  wrapper.appendChild(contentScript);
  viewport.appendChild(wrapper);
  pre.parentNode?.replaceChild(vizContainer, pre);

  requestAnimationFrame(() => window.dispatchEvent(new CustomEvent("viz:init")));

  try {
    const { view, lib } = await loadMarkmapModules();
    const transformer = new lib.Transformer();
    const { root } = transformer.transform(content);
    const opts = getMarkmapOptions();

    const instance = view.Markmap.create(svg, opts, root);
    instanceMap.set(uid, instance);
    applyThemeToSvg(svg);
  } catch (error) {
    const errorEl = document.createElement("div");
    errorEl.className = "markmap-error";
    errorEl.textContent = `Render error: ${error instanceof Error ? error.message : "unknown"}`;
    wrapper.appendChild(errorEl);
  }
}

function applyThemeToSvg(svg: SVGElement) {
  const colors = getThemeColors();
  svg.style.setProperty("--markmap-fg", colors.foreground);
  svg.style.setProperty("--markmap-bg", colors.background);
  svg.style.color = colors.foreground;
}

async function reRenderAll() {
  const { view, lib } = await loadMarkmapModules();
  const opts = getMarkmapOptions();

  for (const wrapper of document.querySelectorAll<HTMLElement>(".markmap-wrapper")) {
    const id = wrapper.getAttribute("data-markmap-id");
    const contentScript = wrapper.querySelector("script.markmap-content");
    const svg = wrapper.querySelector<SVGElement>(".markmap-svg");
    if (!id || !contentScript || !svg) continue;

    const content = JSON.parse(contentScript.textContent || '""');
    if (!content) continue;

    const transformer = new lib.Transformer();
    const { root } = transformer.transform(content);

    svg.innerHTML = "";
    const instance = view.Markmap.create(svg, opts, root);
    instanceMap.set(id, instance);
    applyThemeToSvg(svg);
  }
}

function renderAllVisible() {
  const observer = new IntersectionObserver(
    (entries, obs) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;

        const el = entry.target as HTMLElement;
        obs.unobserve(el);

        if (el.matches("pre.markmap")) {
          renderPreBlock(el);
        } else if (el.matches(".markmap-wrapper")) {
          renderMarkmap(el);
        }
      }
    },
    { rootMargin: "200px" }
  );

  document.querySelectorAll<HTMLElement>(".markmap-wrapper").forEach(wrapper => {
    const svg = wrapper.querySelector(".markmap-svg");
    const hasContent = svg && svg.childElementCount > 0;
    if (!hasContent) observer.observe(wrapper);
  });

  document.querySelectorAll<HTMLElement>("pre.markmap").forEach(pre => {
    observer.observe(pre);
  });
}

window.addEventListener("themechange", () => {
  if ("requestIdleCallback" in window) {
    requestIdleCallback(() => reRenderAll(), { timeout: 300 });
  } else {
    setTimeout(() => reRenderAll(), 100);
  }
});

function init() {
  renderAllVisible();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

document.addEventListener("astro:page-load", init);
