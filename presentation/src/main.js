import { slides } from "./slides.js";
import "./styles.css";

const app = document.querySelector("#app");

let currentIndex = getInitialSlideIndex();
let isOverviewOpen = false;
let areNotesOpen = false;

function getInitialSlideIndex() {
  const params = new URLSearchParams(window.location.search);
  const raw = Number(params.get("slide") ?? 1);
  if (!Number.isFinite(raw)) return 0;
  return Math.min(Math.max(raw - 1, 0), slides.length - 1);
}

function setSlide(nextIndex) {
  currentIndex = Math.min(Math.max(nextIndex, 0), slides.length - 1);
  isOverviewOpen = false;
  syncUrl();
  render();
}

function syncUrl() {
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("slide", String(currentIndex + 1));
  window.history.replaceState({}, "", nextUrl);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function render() {
  const slide = slides[currentIndex];
  app.innerHTML = `
    <main class="presentation-shell">
      <section class="deck-frame" aria-live="polite">
        ${renderChrome(slide)}
        <article class="slide slide--${slide.layout}">
          ${renderSlideBody(slide)}
        </article>
        ${renderFooter(slide)}
      </section>
      ${areNotesOpen ? renderNotes(slide) : ""}
      ${isOverviewOpen ? renderOverview() : ""}
    </main>
  `;

  bindControls();
}

function renderChrome(slide) {
  return `
    <header class="deck-chrome">
      <div class="terminal-prompt">
        <span class="prompt-mark">&gt;_</span>
        <span class="prompt-user">b102@ssafy-project</span><span class="prompt-path">:~$</span>
      </div>
      <div class="deck-status">
        <span class="slide-counter">[${String(currentIndex + 1).padStart(2, "0")}/${String(slides.length).padStart(2, "0")}]</span>
        <div class="progress-dots" aria-label="slide progress">
          ${slides
            .map(
              (_, index) => `
                <button
                  class="progress-dot ${index === currentIndex ? "is-active" : ""}"
                  data-slide-dot="${index}"
                  aria-label="${index + 1}번 슬라이드로 이동"
                ></button>
              `
            )
            .join("")}
        </div>
      </div>
    </header>
    <div class="command-line">
      <span>$</span>
      <code>${escapeHtml(slide.command ?? "presentation --draft")}</code>
    </div>
  `;
}

function renderFooter() {
  return `
    <footer class="deck-footer">
      <div class="footer-actions">
        <button class="nav-button" data-action="prev" ${currentIndex === 0 ? "disabled" : ""}>Prev</button>
        <button class="nav-button" data-action="overview">Overview</button>
        <button class="nav-button" data-action="notes">${areNotesOpen ? "Hide notes" : "Notes"}</button>
        <button class="nav-button nav-button--primary" data-action="next" ${currentIndex === slides.length - 1 ? "disabled" : ""}>Next</button>
      </div>
      <div class="keyboard-hint">Arrow / Space / O / N</div>
    </footer>
  `;
}

function renderNotes(slide) {
  return `
    <aside class="speaker-notes" aria-label="speaker notes">
      <div class="speaker-notes__header">
        <strong>Speaker Notes</strong>
        <button class="icon-button" data-action="notes" aria-label="노트 닫기">x</button>
      </div>
      <p>${escapeHtml(slide.notes)}</p>
    </aside>
  `;
}

function renderOverview() {
  return `
    <aside class="overview-panel" aria-label="slide overview">
      <div class="overview-panel__inner">
        <div class="overview-panel__header">
          <strong>Slide Overview</strong>
          <button class="icon-button" data-action="overview" aria-label="오버뷰 닫기">x</button>
        </div>
        <div class="overview-grid">
          ${slides
            .map(
              (slide, index) => `
                <button class="overview-card ${index === currentIndex ? "is-active" : ""}" data-overview-slide="${index}">
                  <span>${String(index + 1).padStart(2, "0")}</span>
                  <strong>${escapeHtml(slide.title)}</strong>
                  <em>${escapeHtml(slide.section)}</em>
                </button>
              `
            )
            .join("")}
        </div>
      </div>
    </aside>
  `;
}

function renderSlideBody(slide) {
  switch (slide.layout) {
    case "cover":
      return renderCover(slide);
    case "signal":
      return renderSignal(slide);
    case "agenda":
      return renderAgenda(slide);
    case "statement":
      return renderStatement(slide);
    case "compare":
      return renderCompare(slide);
    case "tiles":
      return renderTiles(slide);
    case "gallery":
      return renderGallery(slide);
    case "flow":
      return renderFlow(slide);
    case "split":
      return renderSplit(slide);
    case "architecture":
      return renderArchitecture(slide);
    case "timeline":
      return renderTimeline(slide);
    case "issues":
      return renderIssues(slide);
    case "metrics":
      return renderMetrics(slide);
    case "feedback":
      return renderFeedback(slide);
    case "summary":
      return renderSummary(slide);
    case "demo":
      return renderDemo(slide);
    case "ending":
      return renderEnding(slide);
    default:
      return `<h1>${escapeHtml(slide.title)}</h1>`;
  }
}

function renderEyebrow(slide) {
  return `<p class="eyebrow">[${escapeHtml(slide.section)}]</p>`;
}

function renderTitle(slide) {
  return `
    ${renderEyebrow(slide)}
    <h1>${escapeHtml(slide.title)}${slide.accentTitle ? ` <span>${escapeHtml(slide.accentTitle)}</span>` : ""}</h1>
    ${slide.subtitle ? `<p class="subtitle">${escapeHtml(slide.subtitle)}</p>` : ""}
  `;
}

function renderTags(tags = []) {
  return `<div class="tag-row">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>`;
}

function renderVisual(visual) {
  if (!visual) return "";
  return `
    <figure class="visual-frame">
      <img src="${visual.src}" alt="${escapeHtml(visual.label)}" />
      <figcaption>${escapeHtml(visual.label)}</figcaption>
    </figure>
  `;
}

function renderSignal(slide) {
  return `
    <div class="signal-layout ${slide.visual ? "signal-layout--visual" : ""}">
      <div class="signal-copy">
        ${renderEyebrow(slide)}
        <h1>${escapeHtml(slide.title)}${slide.accentTitle ? ` <span>${escapeHtml(slide.accentTitle)}</span>` : ""}</h1>
        ${slide.subtitle ? `<p class="subtitle">${escapeHtml(slide.subtitle)}</p>` : ""}
        ${slide.signal ? `<strong class="signal-word">${escapeHtml(slide.signal)}</strong>` : ""}
        ${slide.chips?.length ? renderTags(slide.chips) : ""}
      </div>
      ${
        slide.stats?.length
          ? `<div class="signal-stats">
              ${slide.stats
                .map(
                  ([label, value]) => `
                    <section>
                      <span>${escapeHtml(label)}</span>
                      <strong>${escapeHtml(value)}</strong>
                    </section>
                  `
                )
                .join("")}
            </div>`
          : ""
      }
      ${renderVisual(slide.visual)}
    </div>
  `;
}

function renderCover(slide) {
  return `
    <div class="cover-content">
      ${renderEyebrow(slide)}
      <h1>${escapeHtml(slide.title)}<span>${escapeHtml(slide.accentTitle)}</span></h1>
      <p>${escapeHtml(slide.subtitle)}</p>
      ${renderTags(slide.tags)}
    </div>
  `;
}

function renderAgenda(slide) {
  return `
    <div class="center-title">${renderTitle(slide)}</div>
    <div class="agenda-grid">
      ${slide.cards
        .map(
          ([number, title, text]) => `
            <section class="agenda-card">
              <span>${escapeHtml(number)}</span>
              <h2>${escapeHtml(title)}</h2>
              <p>${escapeHtml(text)}</p>
            </section>
          `
        )
        .join("")}
    </div>
  `;
}

function renderStatement(slide) {
  return `
    <div class="split-layout">
      <div>
        ${renderTitle(slide)}
        <ul class="large-list">
          ${slide.points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}
        </ul>
      </div>
      ${renderVisual(slide.visual)}
    </div>
  `;
}

function renderCompare(slide) {
  return `
    ${renderTitle(slide)}
    <div class="compare-grid">
      ${slide.columns
        .map(
          (column) => `
            <section class="compare-card">
              <h2>${escapeHtml(column.title)}</h2>
              <ul>
                ${column.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
              </ul>
            </section>
          `
        )
        .join("")}
    </div>
  `;
}

function renderTiles(slide) {
  return `
    <div class="split-layout split-layout--wide">
      <div>
        ${renderTitle(slide)}
        <div class="tile-grid">
          ${slide.tiles
            .map(
              ([title, text]) => `
                <section class="small-tile">
                  <h2>${escapeHtml(title)}</h2>
                  <p>${escapeHtml(text)}</p>
                </section>
              `
            )
            .join("")}
        </div>
      </div>
      ${renderVisual(slide.visual)}
    </div>
  `;
}

function renderGallery(slide) {
  return `
    ${renderTitle(slide)}
    <div class="gallery-strip">
      ${slide.gallery
        .map(
          (item) => `
            <section class="game-card">
              <img src="${item.image}" alt="${escapeHtml(item.title)}" />
              <div>
                <span>${escapeHtml(item.chapter)}</span>
                <h2>${escapeHtml(item.title)}</h2>
                <p>${escapeHtml(item.text)}</p>
              </div>
            </section>
          `
        )
        .join("")}
    </div>
  `;
}

function renderFlow(slide) {
  return `
    ${renderTitle(slide)}
    <div class="flow-line">
      ${slide.flow
        .map(
          ([title, text], index) => `
            <section class="flow-node">
              <span>${String(index + 1).padStart(2, "0")}</span>
              <h2>${escapeHtml(title)}</h2>
              <p>${escapeHtml(text)}</p>
            </section>
          `
        )
        .join("")}
    </div>
  `;
}

function renderSplit(slide) {
  return `
    <div class="split-layout">
      <div>
        ${renderTitle(slide)}
        <ul class="large-list">
          ${slide.points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}
        </ul>
      </div>
      <pre class="code-panel"><code>${escapeHtml(slide.code.join("\n"))}</code></pre>
    </div>
  `;
}

function renderArchitecture(slide) {
  return `
    ${renderTitle(slide)}
    <div class="architecture-stack">
      ${slide.layers
        .map(
          ([title, text]) => `
            <section>
              <h2>${escapeHtml(title)}</h2>
              <p>${escapeHtml(text)}</p>
            </section>
          `
        )
        .join("")}
    </div>
  `;
}

function renderTimeline(slide) {
  return `
    ${renderTitle(slide)}
    <div class="timeline">
      ${slide.timeline
        .map(
          ([week, title, text]) => `
            <section class="timeline-item">
              <span>${escapeHtml(week)}</span>
              <h2>${escapeHtml(title)}</h2>
              <p>${escapeHtml(text)}</p>
            </section>
          `
        )
        .join("")}
    </div>
  `;
}

function renderIssues(slide) {
  return `
    ${renderTitle(slide)}
    <div class="issue-grid">
      ${slide.issues
        .map(
          ([title, problem, solution]) => `
            <section class="issue-card">
              <h2>${escapeHtml(title)}</h2>
              <p>${escapeHtml(problem)}</p>
              <strong>${escapeHtml(solution)}</strong>
            </section>
          `
        )
        .join("")}
    </div>
  `;
}

function renderMetrics(slide) {
  return `
    ${renderTitle(slide)}
    <div class="metric-grid">
      ${slide.metrics
        .map(
          ([label, value, text]) => `
            <section class="metric-card">
              <span>${escapeHtml(label)}</span>
              <strong>${escapeHtml(value)}</strong>
              <p>${escapeHtml(text)}</p>
            </section>
          `
        )
        .join("")}
    </div>
    <p class="footnote">${escapeHtml(slide.footnote)}</p>
  `;
}

function renderFeedback(slide) {
  return `
    ${renderTitle(slide)}
    <div class="feedback-list">
      ${slide.feedback
        .map(
          ([title, text], index) => `
            <section>
              <span>${String(index + 1).padStart(2, "0")}</span>
              <h2>${escapeHtml(title)}</h2>
              <p>${escapeHtml(text)}</p>
            </section>
          `
        )
        .join("")}
    </div>
  `;
}

function renderSummary(slide) {
  return `
    ${renderTitle(slide)}
    <div class="summary-grid">
      ${slide.summary
        .map(
          ([title, text]) => `
            <section>
              <h2>${escapeHtml(title)}</h2>
              <p>${escapeHtml(text)}</p>
            </section>
          `
        )
        .join("")}
    </div>
  `;
}

function renderDemo(slide) {
  return `
    <div class="split-layout">
      <div>
        ${renderTitle(slide)}
        <ol class="demo-list">
          ${slide.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
        </ol>
      </div>
      ${renderVisual(slide.visual)}
    </div>
  `;
}

function renderEnding(slide) {
  return `
    <div class="ending-content">
      ${renderEyebrow(slide)}
      <h1>${escapeHtml(slide.title)}</h1>
      <p>${escapeHtml(slide.subtitle)}</p>
      ${renderTags(slide.tags)}
    </div>
  `;
}

function bindControls() {
  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.getAttribute("data-action");
      if (action === "prev") setSlide(currentIndex - 1);
      if (action === "next") setSlide(currentIndex + 1);
      if (action === "overview") {
        isOverviewOpen = !isOverviewOpen;
        render();
      }
      if (action === "notes") {
        areNotesOpen = !areNotesOpen;
        render();
      }
    });
  });

  document.querySelectorAll("[data-slide-dot]").forEach((button) => {
    button.addEventListener("click", () => setSlide(Number(button.getAttribute("data-slide-dot"))));
  });

  document.querySelectorAll("[data-overview-slide]").forEach((button) => {
    button.addEventListener("click", () => setSlide(Number(button.getAttribute("data-overview-slide"))));
  });
}

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") {
    event.preventDefault();
    setSlide(currentIndex + 1);
  }

  if (event.key === "ArrowLeft" || event.key === "PageUp" || event.key === "Backspace") {
    event.preventDefault();
    setSlide(currentIndex - 1);
  }

  if (event.key.toLowerCase() === "o") {
    isOverviewOpen = !isOverviewOpen;
    render();
  }

  if (event.key.toLowerCase() === "n") {
    areNotesOpen = !areNotesOpen;
    render();
  }

  if (event.key === "Escape") {
    isOverviewOpen = false;
    areNotesOpen = false;
    render();
  }
});

render();
