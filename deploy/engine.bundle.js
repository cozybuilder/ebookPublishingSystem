var EbookEngine = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/browser/engine-entry.ts
  var engine_entry_exports = {};
  __export(engine_entry_exports, {
    FullBookPDF: () => FullBookPDF,
    applyLayout: () => applyLayout,
    buildPages: () => buildPages,
    mapComponents: () => mapComponents,
    mergeTokens: () => mergeTokens,
    parseBook: () => parseBook,
    renderBookHtml: () => renderBookHtml,
    renderHtml: () => renderHtml,
    resolveThemeByName: () => resolveThemeByName
  });

  // src/parser/parser.ts
  var CONTAINER_BLOCK_NAMES = /* @__PURE__ */ new Set([
    "checklist",
    "compare",
    "before-after",
    "prompt",
    "steps",
    "faq",
    "warning",
    "result",
    "info",
    "tip",
    "note",
    "divider",
    "timeline",
    "stats",
    "chart",
    "feature",
    "progress",
    "stepper",
    "timeline-card",
    "compare-card",
    "alert",
    "process",
    "rating",
    "tags",
    "chips",
    "tree",
    "pagination",
    "empty",
    "search",
    "tooltip",
    "popover",
    "modal",
    "drawer",
    "skeleton",
    "file",
    "image"
  ]);
  var HR_RE = /^(-{3,}|\*{3,}|_{3,})$/;
  var FENCE_OPEN_RE = /^```([\w+-]*)\s*$/;
  var FENCE_CLOSE_RE = /^```\s*$/;
  var CHAPTER_RE = /^##\s+Chapter\s+(\d+)\.\s*(.*)$/i;
  var CONTAINER_OPEN_RE = /^:::\s*([a-zA-Z-]+)\s*$/;
  var CONTAINER_CLOSE_RE = /^:::\s*$/;
  function splitKeyValue(line) {
    const idx = line.indexOf(":");
    if (idx <= 0) return null;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!/^[a-zA-Z_-]+$/.test(key)) return null;
    return { key, value };
  }
  function splitRow(line) {
    return stripBullet(line).split(",").map((c) => c.trim());
  }
  function parseLabelList(lines) {
    const out = [];
    for (const line of lines) {
      if (line.trim() === "") continue;
      if (isBulletLine(line)) {
        out.push(stripBullet(line));
        continue;
      }
      for (const part of line.split(",")) {
        const p = part.trim();
        if (p !== "") out.push(p);
      }
    }
    return out;
  }
  function stripBullet(line) {
    return line.replace(/^\s*-\s+/, "").trim();
  }
  function isBulletLine(line) {
    return /^\s*-\s+/.test(line);
  }
  function isQuoteLine(line) {
    return /^\s*>/.test(line);
  }
  function stripQuoteMarker(line) {
    return line.replace(/^\s*>\s?/, "").trim();
  }
  function isTableLine(line) {
    return /^\s*\|.*\|\s*$/.test(line.trim());
  }
  function isTableSeparator(line) {
    return /^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes("-");
  }
  function splitTableCells(line) {
    let s = line.trim();
    if (s.startsWith("|")) s = s.slice(1);
    if (s.endsWith("|")) s = s.slice(0, -1);
    return s.split("|").map((c) => c.trim());
  }
  function buildContainerBlock(name, body) {
    const nonEmpty = body.filter((l) => l.trim() !== "");
    switch (name) {
      case "checklist":
        return { type: "checklist", items: nonEmpty.map(stripBullet) };
      case "steps":
        return { type: "steps", items: nonEmpty.map(stripBullet) };
      case "compare": {
        let columns = [];
        const rows = [];
        for (const line of nonEmpty) {
          const kv = splitKeyValue(line);
          if (kv && kv.key === "columns") {
            columns = kv.value.split(",").map((c) => c.trim());
          } else if (isBulletLine(line)) {
            rows.push(splitRow(line));
          }
        }
        const block = { type: "compare", columns, rows };
        return block;
      }
      case "before-after": {
        let before = "";
        let after = "";
        for (const line of nonEmpty) {
          const kv = splitKeyValue(line);
          if (!kv) continue;
          if (kv.key === "before") before = kv.value;
          else if (kv.key === "after") after = kv.value;
        }
        return { type: "before-after", before, after };
      }
      case "faq": {
        const pairs = [];
        let current = null;
        for (const line of nonEmpty) {
          const kv = splitKeyValue(line);
          if (kv && kv.key === "q") {
            current = { q: kv.value, a: "" };
            pairs.push(current);
          } else if (kv && kv.key === "a" && current) {
            current.a = kv.value;
          }
        }
        return { type: "faq", pairs };
      }
      case "image": {
        let id = "";
        let imageType = "";
        let prompt = "";
        for (const line of nonEmpty) {
          const kv = splitKeyValue(line);
          if (!kv) continue;
          if (kv.key === "id") id = kv.value;
          else if (kv.key === "type") imageType = kv.value;
          else if (kv.key === "prompt") prompt = kv.value;
        }
        return { type: "image", id, imageType, prompt };
      }
      case "prompt":
        return { type: "prompt", text: body.join("\n").trim() };
      case "warning":
        return { type: "warning", text: body.join("\n").trim() };
      case "result": {
        const lines = [...body];
        let variant;
        const firstIdx = lines.findIndex((l) => l.trim() !== "");
        if (firstIdx !== -1) {
          const kv = splitKeyValue(lines[firstIdx]);
          if (kv && kv.key === "variant") {
            const v = kv.value.trim().toLowerCase();
            if (v === "success" || v === "info" || v === "warning" || v === "error") {
              variant = v;
              lines.splice(0, firstIdx + 1);
            }
          }
        }
        return { type: "result", text: lines.join("\n").trim(), variant };
      }
      case "info":
      case "tip":
      case "note":
        return { type: "callout", variant: name, text: body.join("\n").trim() };
      case "divider":
        return { type: "divider" };
      case "timeline": {
        const items = [];
        let chunk = [];
        const pushChunk = () => {
          var _a, _b;
          if (chunk.length === 0) return;
          items.push({
            date: ((_a = chunk[0]) != null ? _a : "").trim(),
            title: ((_b = chunk[1]) != null ? _b : "").trim(),
            desc: chunk.slice(2).map((s) => s.trim()).join(" ")
          });
          chunk = [];
        };
        for (const line of body) {
          if (line.trim() === "") pushChunk();
          else chunk.push(line);
        }
        pushChunk();
        return { type: "timeline", items };
      }
      case "stats": {
        const items = [];
        let cur = null;
        for (const line of body) {
          if (line.trim() === "") {
            if (cur) {
              items.push(cur);
              cur = null;
            }
            continue;
          }
          const kv = splitKeyValue(line.trim());
          if (!kv) continue;
          if (!cur) cur = { icon: "", value: "", label: "" };
          if (kv.key === "icon") cur.icon = kv.value;
          else if (kv.key === "value") cur.value = kv.value;
          else if (kv.key === "label") cur.label = kv.value;
        }
        if (cur) items.push(cur);
        return { type: "stats", items };
      }
      case "chart": {
        let chartType = "bar";
        let title = "";
        let unit = "";
        let center = "";
        let labels = [];
        let values = [];
        for (const line of nonEmpty) {
          const kv = splitKeyValue(line);
          if (!kv) continue;
          if (kv.key === "type") chartType = kv.value;
          else if (kv.key === "title") title = kv.value;
          else if (kv.key === "unit") unit = kv.value;
          else if (kv.key === "center") center = kv.value;
          else if (kv.key === "labels") labels = kv.value.split(",").map((s) => s.trim()).filter((s) => s !== "");
          else if (kv.key === "values") values = kv.value.split(",").map((s) => Number(s.trim())).filter((nv) => !Number.isNaN(nv));
        }
        return { type: "chart", chartType, title, unit, center, labels, values };
      }
      case "feature": {
        let icon = "";
        let title = "";
        let desc = "";
        const items = [];
        for (const line of nonEmpty) {
          if (isBulletLine(line)) {
            items.push(stripBullet(line));
            continue;
          }
          const kv = splitKeyValue(line);
          if (!kv) continue;
          if (kv.key === "icon") icon = kv.value;
          else if (kv.key === "title") title = kv.value;
          else if (kv.key === "desc") desc = kv.value;
        }
        return { type: "feature", icon, title, desc, items };
      }
      case "progress": {
        const items = [];
        for (const line of nonEmpty) {
          const idx = line.indexOf(":");
          if (idx <= 0) continue;
          const label = line.slice(0, idx).trim();
          const n = Number(line.slice(idx + 1).replace("%", "").trim());
          if (label === "" || Number.isNaN(n)) continue;
          const percent = Math.max(0, Math.min(100, n));
          items.push({ label, percent });
        }
        return { type: "progress", items };
      }
      case "stepper": {
        let current = 1;
        let desc = "";
        const steps = [];
        for (const line of nonEmpty) {
          if (isBulletLine(line)) {
            steps.push(stripBullet(line));
            continue;
          }
          const kv = splitKeyValue(line);
          if (!kv) continue;
          if (kv.key === "current") {
            const n = Number(kv.value.trim());
            if (!Number.isNaN(n)) current = Math.round(n);
          } else if (kv.key === "desc") desc = kv.value;
        }
        current = steps.length > 0 ? Math.max(1, Math.min(steps.length, current)) : 1;
        return { type: "stepper", current, desc, steps };
      }
      case "timeline-card": {
        const items = [];
        let cur = null;
        const pushCur = () => {
          if (cur && cur.title !== "") items.push(cur);
          cur = null;
        };
        for (const line of body) {
          if (line.trim() === "") {
            pushCur();
            continue;
          }
          const kv = splitKeyValue(line.trim());
          if (!kv) continue;
          if (!cur) cur = { date: "", title: "", desc: "" };
          if (kv.key === "date") cur.date = kv.value;
          else if (kv.key === "title") cur.title = kv.value;
          else if (kv.key === "desc") cur.desc = kv.value;
        }
        pushCur();
        return { type: "timeline-card", items };
      }
      case "compare-card": {
        let columns = [];
        let highlight = "";
        const rows = [];
        for (const line of nonEmpty) {
          const kv = splitKeyValue(line);
          if (kv && kv.key === "columns") columns = kv.value.split(",").map((c) => c.trim());
          else if (kv && kv.key === "highlight") highlight = kv.value.trim();
          else if (isBulletLine(line)) rows.push(splitRow(line));
        }
        return { type: "compare-card", columns, highlight, rows };
      }
      case "alert": {
        let variant = "info";
        const textLines = [];
        for (const line of nonEmpty) {
          const kv = splitKeyValue(line);
          if (kv && kv.key === "variant") {
            const v = kv.value.trim().toLowerCase();
            if (v === "success" || v === "info" || v === "warning" || v === "error") variant = v;
          } else if (kv && kv.key === "text") textLines.push(kv.value);
          else textLines.push(line.trim());
        }
        return { type: "alert", variant, text: textLines.join(" ").trim() };
      }
      case "process": {
        const items = [];
        let cur = null;
        const push = () => {
          if (cur && cur.title !== "") items.push(cur);
          cur = null;
        };
        for (const line of body) {
          if (line.trim() === "") {
            push();
            continue;
          }
          const kv = splitKeyValue(line.trim());
          if (!kv) continue;
          if (!cur) cur = { icon: "", title: "", desc: "" };
          if (kv.key === "icon") cur.icon = kv.value;
          else if (kv.key === "title") cur.title = kv.value;
          else if (kv.key === "desc") cur.desc = kv.value;
        }
        push();
        return { type: "process", items };
      }
      case "rating": {
        let value = 0;
        let max = 5;
        let label = "";
        for (const line of nonEmpty) {
          const kv = splitKeyValue(line);
          if (!kv) continue;
          if (kv.key === "value") {
            const n = Number(kv.value.trim());
            if (!Number.isNaN(n)) value = n;
          } else if (kv.key === "max") {
            const n = Number(kv.value.trim());
            if (!Number.isNaN(n) && n > 0) max = n;
          } else if (kv.key === "label") label = kv.value;
        }
        value = Math.max(0, Math.min(max, value));
        return { type: "rating", value, max, label };
      }
      case "tags":
        return { type: "tags", items: parseLabelList(nonEmpty) };
      case "chips":
        return { type: "chips", items: parseLabelList(nonEmpty) };
      case "tree": {
        const items = [];
        for (const raw of body) {
          if (raw.trim() === "") continue;
          const m = raw.match(/^(\s*)-\s+(.*)$/);
          if (!m) continue;
          const indent = m[1].replace(/\t/g, "  ");
          const depth = Math.floor(indent.length / 2);
          items.push({ depth, label: m[2].trim() });
        }
        return { type: "tree", items };
      }
      case "pagination": {
        let current = 1;
        let total = 1;
        for (const line of nonEmpty) {
          const kv = splitKeyValue(line);
          if (!kv) continue;
          if (kv.key === "current") {
            const n = Number(kv.value.trim());
            if (!Number.isNaN(n)) current = n;
          } else if (kv.key === "total") {
            const n = Number(kv.value.trim());
            if (!Number.isNaN(n)) total = n;
          }
        }
        total = Math.max(1, Math.round(total));
        current = Math.max(1, Math.min(total, Math.round(current)));
        return { type: "pagination", current, total };
      }
      case "empty": {
        let icon = "";
        let title = "";
        let desc = "";
        for (const line of nonEmpty) {
          const kv = splitKeyValue(line);
          if (!kv) continue;
          if (kv.key === "icon") icon = kv.value;
          else if (kv.key === "title") title = kv.value;
          else if (kv.key === "desc") desc = kv.value;
        }
        return { type: "empty", icon, title, desc };
      }
      case "search": {
        let placeholder = "";
        let query = "";
        for (const line of nonEmpty) {
          const kv = splitKeyValue(line);
          if (!kv) continue;
          if (kv.key === "placeholder") placeholder = kv.value;
          else if (kv.key === "query") query = kv.value;
        }
        return { type: "search", placeholder, query };
      }
      case "tooltip": {
        let label = "";
        const textLines = [];
        for (const line of nonEmpty) {
          const kv = splitKeyValue(line);
          if (kv && kv.key === "label") label = kv.value;
          else if (kv && kv.key === "text") textLines.push(kv.value);
          else textLines.push(line.trim());
        }
        return { type: "tooltip", label, text: textLines.join(" ").trim() };
      }
      case "popover": {
        let title = "";
        const textLines = [];
        for (const line of nonEmpty) {
          const kv = splitKeyValue(line);
          if (kv && kv.key === "title") title = kv.value;
          else if (kv && kv.key === "text") textLines.push(kv.value);
          else textLines.push(line.trim());
        }
        return { type: "popover", title, text: textLines.join(" ").trim() };
      }
      case "modal": {
        let title = "";
        const textLines = [];
        for (const line of nonEmpty) {
          const kv = splitKeyValue(line);
          if (kv && kv.key === "title") title = kv.value;
          else if (kv && kv.key === "text") textLines.push(kv.value);
          else textLines.push(line.trim());
        }
        return { type: "modal", title, text: textLines.join(" ").trim() };
      }
      case "drawer": {
        let title = "";
        const textLines = [];
        for (const line of nonEmpty) {
          const kv = splitKeyValue(line);
          if (kv && kv.key === "title") title = kv.value;
          else if (kv && kv.key === "text") textLines.push(kv.value);
          else textLines.push(line.trim());
        }
        return { type: "drawer", title, text: textLines.join(" ").trim() };
      }
      case "skeleton": {
        let lines = 3;
        for (const line of nonEmpty) {
          const kv = splitKeyValue(line);
          if (kv && kv.key === "lines") {
            const n = Number(kv.value.trim());
            if (!Number.isNaN(n) && n > 0) lines = Math.min(12, Math.round(n));
          }
        }
        return { type: "skeleton", lines };
      }
      case "file": {
        let name2 = "";
        let size = "";
        let fileType = "";
        for (const line of nonEmpty) {
          const kv = splitKeyValue(line);
          if (!kv) continue;
          if (kv.key === "name") name2 = kv.value;
          else if (kv.key === "size") size = kv.value;
          else if (kv.key === "type") fileType = kv.value;
        }
        return { type: "file", name: name2, size, fileType };
      }
      default:
        return { type: "paragraph", text: body.join("\n").trim() };
    }
  }
  function parseBook(markdown) {
    var _a;
    const lines = markdown.replace(/\r\n/g, "\n").split("\n");
    const metadata = { title: "" };
    const chapters = [];
    let current = null;
    let i = 0;
    for (; i < lines.length; i++) {
      const line = lines[i];
      const t = line.trim();
      if (t === "") continue;
      if (t.startsWith("# ") && !t.startsWith("## ")) {
        metadata.title = t.slice(2).trim();
        continue;
      }
      const kv = splitKeyValue(t);
      if (kv && kv.key === "subtitle") {
        metadata.subtitle = kv.value;
        continue;
      }
      if (kv && kv.key === "author") {
        metadata.author = kv.value;
        continue;
      }
      if (kv && kv.key === "cover") {
        metadata.cover = kv.value;
        continue;
      }
      break;
    }
    let paragraphBuf = [];
    const flushParagraph = () => {
      if (paragraphBuf.length === 0) return;
      const text = paragraphBuf.join(" ").replace(/\s+/g, " ").trim();
      paragraphBuf = [];
      if (text === "") return;
      if (current) current.blocks.push({ type: "paragraph", text });
    };
    for (; i < lines.length; i++) {
      const line = lines[i];
      const t = line.trim();
      const chapterMatch = t.match(CHAPTER_RE);
      if (chapterMatch) {
        flushParagraph();
        current = {
          number: Number(chapterMatch[1]),
          title: chapterMatch[2].trim(),
          blocks: []
        };
        chapters.push(current);
        continue;
      }
      if (t === "") {
        flushParagraph();
        continue;
      }
      if (HR_RE.test(t)) {
        flushParagraph();
        if (current) current.blocks.push({ type: "divider" });
        continue;
      }
      const fence = t.match(FENCE_OPEN_RE);
      if (fence) {
        flushParagraph();
        const lang = ((_a = fence[1]) != null ? _a : "").trim();
        const codeLines = [];
        i++;
        for (; i < lines.length; i++) {
          if (FENCE_CLOSE_RE.test(lines[i].trim())) break;
          codeLines.push(lines[i]);
        }
        if (current) current.blocks.push({ type: "code", lang, code: codeLines.join("\n") });
        continue;
      }
      const open = t.match(CONTAINER_OPEN_RE);
      if (open && CONTAINER_BLOCK_NAMES.has(open[1])) {
        flushParagraph();
        const name = open[1];
        const body = [];
        i++;
        for (; i < lines.length; i++) {
          if (CONTAINER_CLOSE_RE.test(lines[i].trim())) break;
          body.push(lines[i]);
        }
        const block = buildContainerBlock(name, body);
        if (current) current.blocks.push(block);
        continue;
      }
      if (isQuoteLine(line)) {
        flushParagraph();
        const quoteLines = [];
        for (; i < lines.length; i++) {
          if (!isQuoteLine(lines[i])) {
            i--;
            break;
          }
          quoteLines.push(stripQuoteMarker(lines[i]));
        }
        const text = quoteLines.join(" ").replace(/\s+/g, " ").trim();
        if (current && text !== "") current.blocks.push({ type: "quote", text });
        continue;
      }
      if (isTableLine(line)) {
        flushParagraph();
        const tableLines = [];
        for (; i < lines.length; i++) {
          if (!isTableLine(lines[i])) {
            i--;
            break;
          }
          tableLines.push(lines[i]);
        }
        const table = buildTable(tableLines);
        if (current && table) current.blocks.push(table);
        continue;
      }
      paragraphBuf.push(t);
    }
    flushParagraph();
    return { metadata, chapters };
  }
  function buildTable(tableLines) {
    if (tableLines.length === 0) return null;
    const rowsRaw = tableLines.map(splitTableCells);
    const columns = rowsRaw[0];
    let dataStart = 1;
    if (tableLines.length > 1 && isTableSeparator(tableLines[1])) dataStart = 2;
    const rows = rowsRaw.slice(dataStart);
    return { type: "table", columns, rows };
  }

  // src/page-builder/page-builder.ts
  function buildPages(book, profile) {
    switch (profile.name) {
      case "FullBookPDF":
        return buildFullBookPages(book);
      case "KmongPreviewPDF":
        return buildFullBookPages(book);
      case "ChecklistPDF":
        return buildChecklistPages(book);
      default:
        throw new Error(`\uC544\uC9C1 \uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294 \uD504\uB85C\uD30C\uC77C\uC785\uB2C8\uB2E4: ${profile.name}`);
    }
  }
  function buildFullBookPages(book) {
    const pages = [];
    pages.push({ type: "CoverPage", blockRefs: [] });
    pages.push({ type: "CopyrightPage", blockRefs: [] });
    pages.push({ type: "TableOfContentsPage", blockRefs: [] });
    book.chapters.forEach((chapter, chapterIndex) => {
      pages.push({ type: "ChapterPage", chapterIndex, blockRefs: [] });
      if (chapter.blocks.length > 0) {
        pages.push({
          type: "ContentPage",
          chapterIndex,
          blockRefs: chapter.blocks.map((_block, blockIndex) => ({
            chapterIndex,
            blockIndex
          }))
        });
      }
    });
    return pages;
  }
  function buildChecklistPages(book) {
    const pages = [];
    book.chapters.forEach((chapter, chapterIndex) => {
      chapter.blocks.forEach((block, blockIndex) => {
        if (block.type === "checklist") {
          pages.push({
            type: "ChecklistPage",
            chapterIndex,
            blockRefs: [{ chapterIndex, blockIndex }]
          });
        }
      });
    });
    return pages;
  }

  // src/component-mapper/component-mapper.ts
  function mapComponents(book, pages) {
    return pages.map((page) => ({
      type: page.type,
      chapterIndex: page.chapterIndex,
      components: componentsForPage(book, page)
    }));
  }
  function componentsForPage(book, page) {
    switch (page.type) {
      case "CoverPage":
        return coverComponents(book);
      case "CopyrightPage":
        return copyrightComponents(book);
      case "TableOfContentsPage":
        return tocComponents(book);
      case "ChapterPage":
        return chapterHeadingComponents(book, page);
      default:
        return page.blockRefs.map((ref) => {
          var _a;
          const block = (_a = book.chapters[ref.chapterIndex]) == null ? void 0 : _a.blocks[ref.blockIndex];
          if (!block) throw new Error(`\uC798\uBABB\uB41C blockRef: ch${ref.chapterIndex}/block${ref.blockIndex}`);
          return blockToComponent(block);
        });
    }
  }
  function coverComponents(book) {
    const out = [{ type: "TitleBlock", text: book.metadata.title }];
    if (book.metadata.subtitle) out.push({ type: "SubtitleBlock", text: book.metadata.subtitle });
    if (book.metadata.author) out.push({ type: "AuthorBlock", text: book.metadata.author });
    return out;
  }
  function copyrightComponents(book) {
    var _a;
    const author = (_a = book.metadata.author) != null ? _a : "";
    const title = book.metadata.title;
    const text = `\u300A${title}\u300B
\xA9 ${author}
All rights reserved.`;
    return [{ type: "CopyrightNotice", text }];
  }
  function tocComponents(book) {
    return [
      {
        type: "TableOfContentsList",
        entries: book.chapters.map((c) => ({ number: c.number, title: c.title }))
      }
    ];
  }
  function chapterHeadingComponents(book, page) {
    var _a;
    const ci = (_a = page.chapterIndex) != null ? _a : -1;
    const chapter = book.chapters[ci];
    if (!chapter) throw new Error(`ChapterPage \uC758 chapterIndex \uAC00 \uC798\uBABB\uB428: ${ci}`);
    return [{ type: "ChapterHeading", number: chapter.number, title: chapter.title }];
  }
  function blockToComponent(block) {
    switch (block.type) {
      case "paragraph":
        return { type: "ParagraphBlock", text: block.text };
      case "quote":
        return { type: "QuoteBlock", text: block.text };
      case "table":
        return { type: "TableCard", columns: block.columns, rows: block.rows };
      case "checklist":
        return { type: "ChecklistCard", items: block.items };
      case "compare":
        return { type: "CompareCard", columns: block.columns, rows: block.rows };
      case "before-after":
        return { type: "BeforeAfterCard", before: block.before, after: block.after };
      case "prompt":
        return { type: "PromptCard", text: block.text };
      case "steps":
        return { type: "StepsCard", items: block.items };
      case "faq":
        return { type: "FAQCard", pairs: block.pairs };
      case "warning":
        return { type: "WarningCard", text: block.text };
      case "result":
        return { type: "ResultCard", text: block.text, variant: block.variant };
      case "callout":
        return { type: "CalloutCard", variant: block.variant, text: block.text };
      case "divider":
        return { type: "Divider" };
      case "code":
        return { type: "CodeBlock", lang: block.lang, code: block.code };
      case "timeline":
        return { type: "TimelineCard", items: block.items };
      case "stats":
        return { type: "StatsCard", items: block.items };
      case "chart":
        return {
          type: "ChartCard",
          chartType: block.chartType,
          title: block.title,
          unit: block.unit,
          center: block.center,
          labels: block.labels,
          values: block.values
        };
      case "feature":
        return { type: "FeatureCard", icon: block.icon, title: block.title, desc: block.desc, items: block.items };
      case "progress":
        return { type: "ProgressCard", items: block.items };
      case "stepper":
        return { type: "StepperCard", current: block.current, desc: block.desc, steps: block.steps };
      case "timeline-card":
        return { type: "TimelineCardList", items: block.items };
      case "compare-card":
        return { type: "ComparisonCard", columns: block.columns, highlight: block.highlight, rows: block.rows };
      case "alert":
        return { type: "AlertCard", variant: block.variant, text: block.text };
      case "process":
        return { type: "ProcessCard", items: block.items };
      case "rating":
        return { type: "RatingCard", value: block.value, max: block.max, label: block.label };
      case "tags":
        return { type: "TagGroup", items: block.items };
      case "chips":
        return { type: "ChipGroup", items: block.items };
      case "tree":
        return { type: "TreeCard", items: block.items };
      case "pagination":
        return { type: "PaginationCard", current: block.current, total: block.total };
      case "empty":
        return { type: "EmptyState", icon: block.icon, title: block.title, desc: block.desc };
      case "search":
        return { type: "SearchBar", placeholder: block.placeholder, query: block.query };
      case "tooltip":
        return { type: "TooltipBox", label: block.label, text: block.text };
      case "popover":
        return { type: "PopoverBox", title: block.title, text: block.text };
      case "modal":
        return { type: "ModalCard", title: block.title, text: block.text };
      case "drawer":
        return { type: "DrawerCard", title: block.title, text: block.text };
      case "skeleton":
        return { type: "SkeletonCard", lines: block.lines };
      case "file":
        return { type: "FileCard", name: block.name, size: block.size, fileType: block.fileType };
      case "image":
        return { type: "ImageBlock", id: block.id, imageType: block.imageType, prompt: block.prompt };
    }
  }

  // src/layout-engine/layout-engine.ts
  var TONE_BY_COMPONENT = {
    WarningCard: "emphasis",
    ResultCard: "emphasis",
    PromptCard: "info",
    StepsCard: "info",
    FAQCard: "info",
    ChecklistCard: "neutral",
    TableCard: "neutral",
    CompareCard: "neutral",
    BeforeAfterCard: "neutral",
    CalloutCard: "info",
    FeatureCard: "info"
  };
  var TYPOGRAPHY_BY_COMPONENT = {
    TitleBlock: "title",
    SubtitleBlock: "emphasis",
    AuthorBlock: "caption",
    ChapterHeading: "chapter",
    CopyrightNotice: "caption",
    ImageBlock: "caption"
    // 나머지(Paragraph/카드/TOCList)는 기본 body
  };
  var RADIUS_BY_COMPONENT = {
    ImageBlock: "image",
    ChecklistCard: "card",
    TableCard: "card",
    CompareCard: "card",
    BeforeAfterCard: "card",
    PromptCard: "card",
    StepsCard: "card",
    FAQCard: "card",
    WarningCard: "card",
    ResultCard: "card",
    CalloutCard: "card",
    TimelineCard: "card",
    FeatureCard: "card",
    ProgressCard: "card",
    StepperCard: "card",
    TimelineCardList: "card"
  };
  var SPACING_BY_COMPONENT = {
    TitleBlock: "xl",
    ChapterHeading: "xl",
    SubtitleBlock: "sm",
    AuthorBlock: "sm",
    CopyrightNotice: "sm"
  };
  function toneFor(ct) {
    var _a;
    return (_a = TONE_BY_COMPONENT[ct]) != null ? _a : "neutral";
  }
  function typographyFor(ct) {
    var _a;
    return (_a = TYPOGRAPHY_BY_COMPONENT[ct]) != null ? _a : "body";
  }
  function radiusFor(ct) {
    var _a;
    return (_a = RADIUS_BY_COMPONENT[ct]) != null ? _a : null;
  }
  function spacingFor(ct) {
    var _a;
    return (_a = SPACING_BY_COMPONENT[ct]) != null ? _a : "md";
  }
  function applyLayout(pages, _tokens) {
    let counter = 0;
    const nextId = () => `cmp-${String(++counter).padStart(4, "0")}`;
    return pages.map((page) => {
      const components = page.components.map((component) => ({
        componentId: nextId(),
        componentType: component.type,
        tone: toneFor(component.type),
        typographyRole: typographyFor(component.type),
        spacing: spacingFor(component.type),
        radius: radiusFor(component.type),
        bounds: null,
        // v0.1: 좌표 미계산
        component
      }));
      return {
        pageType: page.type,
        chapterIndex: page.chapterIndex,
        canvas: null,
        // PDF(fixed) 프로파일은 페이지 캔버스 없음. 이미지 프로파일에서 채움(추후)
        components
      };
    });
  }

  // src/charts/bar-chart.ts
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function niceMax(v) {
    if (v <= 0) return 1;
    const pow = Math.pow(10, Math.floor(Math.log10(v)));
    const f = v / pow;
    const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
    return nf * pow;
  }
  function fmt(v) {
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
  }
  function buildBarSvg(labels, values) {
    const n = Math.min(labels.length, values.length);
    if (n === 0) return "";
    const W = 380;
    const H = 210;
    const left = 44;
    const right = 364;
    const top = 16;
    const bottom = 170;
    const plotH = bottom - top;
    const plotW = right - left;
    const max = niceMax(Math.max(...values.slice(0, n), 0));
    const slotW = plotW / n;
    const barW = Math.min(slotW * 0.55, 56);
    const yOf = (v) => bottom - v / max * plotH;
    let grid = "";
    for (let i = 0; i <= 4; i++) {
      const v = max * i / 4;
      const y = yOf(v);
      grid += `<line x1="${left}" y1="${y.toFixed(1)}" x2="${right}" y2="${y.toFixed(1)}" stroke="${i === 0 ? "#E5E7EB" : "#F1F3F6"}"/><text x="${left - 6}" y="${(y + 3).toFixed(1)}" font-size="9" fill="#9CA3AF" text-anchor="end">${fmt(v)}</text>`;
    }
    let bars = "";
    for (let i = 0; i < n; i++) {
      const cx = left + slotW * i + slotW / 2;
      const v = values[i];
      const y = yOf(v);
      const h = bottom - y;
      bars += `<rect x="${(cx - barW / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="#2563EB"/><text x="${cx.toFixed(1)}" y="${(y - 6).toFixed(1)}" font-size="10" font-weight="700" fill="#1D4ED8" text-anchor="middle">${esc(fmt(v))}</text><text x="${cx.toFixed(1)}" y="186" font-size="10" fill="#374151" text-anchor="middle">${esc(labels[i])}</text>`;
    }
    const axisY = `<line x1="${left}" y1="${top}" x2="${left}" y2="${bottom}" stroke="#E5E7EB"/>`;
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img">${grid}${axisY}${bars}</svg>`;
  }

  // src/charts/donut-chart.ts
  var DONUT_COLORS = ["#2563EB", "#16A34A", "#F59E0B", "#9CA3AF"];
  function esc2(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function fmt2(v) {
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
  }
  function buildDonutSvg(labels, values, center, unit) {
    const n = Math.min(labels.length, values.length);
    if (n === 0) return "";
    const vals = values.slice(0, n);
    const total = vals.reduce((a, b) => a + b, 0);
    if (total <= 0) return "";
    const r = 40;
    const C = 2 * Math.PI * r;
    let off = 0;
    let segs = "";
    for (let i = 0; i < n; i++) {
      const dash = vals[i] / total * C;
      const color = DONUT_COLORS[i % DONUT_COLORS.length];
      segs += `<circle cx="60" cy="60" r="${r}" fill="none" stroke="${color}" stroke-width="18" stroke-dasharray="${dash.toFixed(1)} ${(C - dash).toFixed(1)}" stroke-dashoffset="${(-off).toFixed(1)}" transform="rotate(-90 60 60)"/>`;
      off += dash;
    }
    const sumText = `${fmt2(total)}${unit ? esc2(unit) : ""}`;
    const centerSvg = center ? `<text x="60" y="56" font-size="9" fill="#9CA3AF" text-anchor="middle">${esc2(center)}</text><text x="60" y="71" font-size="13" font-weight="700" fill="#111827" text-anchor="middle">${esc2(sumText)}</text>` : `<text x="60" y="65" font-size="13" font-weight="700" fill="#111827" text-anchor="middle">${esc2(sumText)}</text>`;
    return `<svg viewBox="0 0 120 120" width="130" height="130" xmlns="http://www.w3.org/2000/svg" role="img">${segs}${centerSvg}</svg>`;
  }

  // src/html-renderer/html-renderer.ts
  var BASE_RECIPE = {
    pageBackground: "linear-gradient(180deg, #f1eee7 0%, #ece8df 100%)",
    pageShadow: true,
    pageRadius: 22,
    cardShadow: true,
    cardTint: true,
    cardBorder: "rgba(31,45,90,.10)",
    accent: true,
    tableHeaderTinted: true,
    checkboxRadius: 7,
    density: "comfortable",
    cardStyle: "soft",
    tableStyle: "lined",
    badgeStyle: "solid",
    gridStyle: "stack",
    variant: "none"
  };
  function esc3(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function nl2br(s) {
    return esc3(s).replace(/\n/g, "<br>");
  }
  function inlineHtml(s) {
    return esc3(s).replace(/==([^=]+?)==/g, '<mark class="hl">$1</mark>').replace(/\[\[tag:\s*([^\]]+?)\s*\]\]/g, '<span class="tag-inline">$1</span>');
  }
  function buildCss(t, r) {
    const c = t.colors;
    const ty = t.typography;
    const sp = t.spacing;
    const softStack = 'Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", system-ui, sans-serif';
    const pageShadow = r.pageShadow ? "0 18px 50px rgba(31,45,90,.10), 0 2px 6px rgba(31,45,90,.05)" : "none";
    const cardShadow = r.cardShadow ? "0 6px 18px rgba(31,45,90,.05)" : "none";
    const emphasisBg = r.cardTint ? "#fff6ee" : "#fff";
    const emphasisLine = r.cardTint ? "#fbe0c8" : r.cardBorder;
    const infoBg = r.cardTint ? "#ecfafc" : "#fff";
    const infoLine = r.cardTint ? "#cdeef3" : r.cardBorder;
    const thBg = r.tableHeaderTinted ? "var(--neutral-bg)" : "#fff";
    const subtitleAccentDisplay = r.accent ? "block" : "none";
    const stepsBadgeShadow = r.accent ? "0 4px 10px rgba(31,182,201,.35)" : "none";
    const rowHover = r.accent ? "#fafbfe" : "transparent";
    const spacious = r.density === "spacious";
    const pagePadding = spacious ? "96px 80px" : "64px 56px";
    const pageBorder = r.pageShadow ? "none" : `1px solid ${r.cardBorder}`;
    const cardPadding = spacious ? "var(--sp-xl)" : "var(--sp-lg)";
    const blockGap = spacious ? "var(--sp-xl)" : "var(--sp-lg)";
    const cardBg = r.cardStyle === "glass" ? "#fcfdff" : "#fff";
    const cellPad = r.tableStyle === "open" ? "18px 22px" : "14px 18px";
    const tblBorder = r.tableStyle === "open" ? "transparent" : "var(--neutral-line)";
    const badgeBg = r.badgeStyle === "outline" ? "#fff" : "var(--cyan)";
    const badgeColor = r.badgeStyle === "outline" ? "var(--cyan)" : "#fff";
    const badgeBorder = r.badgeStyle === "outline" ? "2px solid var(--cyan)" : "0";
    return `
:root {
  --navy: ${c.navy};
  --orange: ${c.orange};
  --cyan: ${c.cyan};
  --ink: ${c.ink};
  --gray: ${c.gray};
  --paper: ${c.paper};

  /* \uC758\uBBF8 \uD1A4\uBCC4 \uBC30\uACBD/\uD3EC\uC778\uD2B8 (\uB808\uC2DC\uD53C\uAC00 \uD2F4\uD2B8 on/off \uACB0\uC815) */
  --emphasis-bg: ${emphasisBg};
  --emphasis-line: ${emphasisLine};
  --info-bg: ${infoBg};
  --info-line: ${infoLine};
  --neutral-bg: #f6f8fc;
  --neutral-line: #e7ecf5;
  --hairline: ${r.cardBorder};

  --font: ${ty.fontFamily === "system" ? softStack : ty.fontFamily};
  --fs-title: ${ty.scale.title}px;
  --fs-chapter: ${ty.scale.chapter}px;
  --fs-body: ${ty.scale.body}px;
  --fs-caption: ${ty.scale.caption}px;
  --fs-emphasis: ${ty.scale.emphasis}px;
  --lh-body: ${ty.lineHeight.body};
  --lh-heading: ${ty.lineHeight.heading};

  --sp-xs: ${sp.xs}px;
  --sp-sm: ${sp.sm}px;
  --sp-md: ${sp.md}px;
  --sp-lg: ${sp.lg}px;
  --sp-xl: ${sp.xl}px;
  --sp-xxl: ${sp.xxl}px;

  --r-card: ${t.radius.card}px;
  --r-image: ${t.radius.image}px;

  /* Design System v3 \uD314\uB808\uD2B8 */
  --v3-primary: #0D1B3D;
  --v3-blue: #2563EB;
  --v3-purple: #7C3AED;
  --v3-green: #10B981;
  --v3-amber: #F59E0B;
  --v3-red: #EF4444;
  --v3-g900: #111827;
  --v3-g700: #374151;
  --v3-g500: #6B7280;
  --v3-g300: #D1D5DB;
  --v3-g100: #F3F4F6;
}

* { box-sizing: border-box; }
html { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
body {
  margin: 0;
  background: ${r.pageBackground};
  font-family: var(--font);
  color: var(--ink);
  line-height: var(--lh-body);
  letter-spacing: -0.01em;
}
.book { padding: var(--sp-xxl) var(--sp-lg); }

/* \uC804\uC790\uCC45 \uD55C \uBA74 */
.page {
  position: relative;
  background: var(--paper);
  width: 840px;
  max-width: 100%;
  margin: 0 auto var(--sp-xl);
  padding: ${pagePadding};
  border-radius: ${r.pageRadius}px;
  box-shadow: ${pageShadow};
  border: ${pageBorder};
}
/* \uD45C\uC9C0(CoverPage) \u2014 \uC0C1\uD488\uD615 \uCEE4\uBC84: \uC138\uB85C \uC911\uC559 \uC815\uB82C + \uD070 \uC81C\uBAA9 */
.page[data-page="CoverPage"] {
  display: flex; flex-direction: column; justify-content: center;
  min-height: 70vh; text-align: center;
}
.page[data-page="CoverPage"] .ty-title {
  font-size: calc(var(--fs-title) * 1.28); margin: 0 0 var(--sp-lg);
}
.page[data-page="CoverPage"] .subtitle-accent { margin-left: auto; margin-right: auto; }
.page[data-page="CoverPage"] .ty-emphasis { color: var(--gray); font-weight: 500; }
.page[data-page="CoverPage"] .ty-caption { margin-top: var(--sp-xl); font-size: var(--fs-body); }
/* \uD45C\uC9C0 \uC774\uBBF8\uC9C0(\uC0C1\uD488\uD615 \uCEE4\uBC84) \u2014 \uC774\uBBF8\uC9C0(\uBC30\uACBD) + \uADF8\uB77C\uB370\uC774\uC158 \uC2A4\uD06C\uB9BC + \uC81C\uBAA9/\uBD80\uC81C/\uC800\uC790 \uC624\uBC84\uB808\uC774 */
.page[data-page="CoverPage"]:has(.cover-image) { padding: 0; min-height: 70vh; overflow: hidden; }
.page[data-page="CoverPage"]:has(.cover-image) .page-body {
  position: relative; min-height: 70vh; overflow: hidden;
  display: flex; flex-direction: column; justify-content: flex-end; align-items: center;
  text-align: center; padding: var(--sp-xl);
}
.page[data-page="CoverPage"] .cover-image {
  position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; border-radius: inherit;
}
.page[data-page="CoverPage"]:has(.cover-image) .page-body::before {
  content: ''; position: absolute; inset: 0; z-index: 1;
  background: linear-gradient(180deg, rgba(12,18,38,.10) 25%, rgba(12,18,38,.55) 65%, rgba(12,18,38,.85) 100%);
}
.page[data-page="CoverPage"]:has(.cover-image) .page-body > [data-type="TitleBlock"],
.page[data-page="CoverPage"]:has(.cover-image) .page-body > [data-type="SubtitleBlock"],
.page[data-page="CoverPage"]:has(.cover-image) .page-body > [data-type="AuthorBlock"] { position: relative; z-index: 2; }
.page[data-page="CoverPage"]:has(.cover-image) .ty-title { color: #fff; text-shadow: 0 2px 12px rgba(0,0,0,.6); }
.page[data-page="CoverPage"]:has(.cover-image) .ty-emphasis,
.page[data-page="CoverPage"]:has(.cover-image) .ty-caption { color: rgba(255,255,255,.95); text-shadow: 0 2px 10px rgba(0,0,0,.55); }
.page[data-page="CoverPage"]:has(.cover-image) .subtitle-accent { background: #fff; }
/* \uBCF8\uBB38 \uC774\uBBF8\uC9C0(ImageBlock \uC2E4\uD574\uC11D) \u2014 \uC911\uC559 \uC815\uB82C, \uACFC\uB3C4\uD55C \uB192\uC774 \uC81C\uD55C, \uCEA1\uC158 */
.fig { margin: var(--sp-lg) 0; text-align: center; }
.fig-img { display: block; max-width: 100%; max-height: 460px; width: auto; margin: 0 auto; border-radius: 14px; box-shadow: 0 8px 28px rgba(16,24,40,.12); }
.fig-cap { margin-top: var(--sp-sm); font-size: var(--fs-caption); color: var(--gray); }

/* \uCC55\uD130 \uC624\uD504\uB108(ChapterPage) \u2014 \uBCF8\uBB38\uACFC \uC790\uC5F0\uC2A4\uB7FD\uAC8C \uC5F0\uACB0(\uC778\uC1C4 \uC2DC break \uBCF4\uC815) */
.page[data-page="ChapterPage"] .ty-chapter { font-size: calc(var(--fs-chapter) * 1.08); }

/* \uD0C0\uC774\uD3EC \uC704\uACC4 */
.ty-title {
  font-size: var(--fs-title); line-height: var(--lh-heading);
  color: var(--navy); font-weight: 800; letter-spacing: -0.02em;
  margin: 0 0 var(--sp-md);
  word-break: keep-all; overflow-wrap: break-word;
}
.ty-chapter {
  font-size: var(--fs-chapter); line-height: var(--lh-heading);
  color: var(--navy); font-weight: 750; letter-spacing: -0.02em;
  margin: 0 0 var(--sp-sm);
  word-break: keep-all; overflow-wrap: break-word;
}
/* \uBCF8\uBB38 \uAC00\uB3C5\uC131(\uBBF8\uB9AC\uBCF4\uAE30/\uC5D0\uC138\uC774\xB7\uBA85\uC5B8\uC9D1): \uC904 \uAC04\uACA9\xB7\uBB38\uB2E8 \uB9AC\uB4EC \uD655\uB300(\uC778\uC1C4 \uBC00\uB3C4\uB294 PRINT_CSS \uAC00 \uBCC4\uB3C4 \uC81C\uC5B4) */
.ty-body { font-size: var(--fs-body); line-height: 1.85; margin: 0 0 calc(var(--sp-md) * 1.35); color: #2b3346; }
.ty-caption { font-size: var(--fs-caption); color: var(--gray); margin: 0 0 var(--sp-sm); }
.ty-emphasis { font-size: var(--fs-emphasis); color: #41506e; font-weight: 600; margin: 0 0 var(--sp-md); }
/* \uCC55\uD130 \uC81C\uBAA9\uACFC \uBCF8\uBB38 \uC0AC\uC774 \uD638\uD761 + \uC778\uC6A9/\uAC15\uC870 \uAD6C\uBD84 \uAC15\uD654 */
.page[data-page="ChapterPage"] .ty-chapter { margin-bottom: var(--sp-md); }
.quote { margin: calc(var(--sp-lg)) 0; }

.subtitle-accent { display: ${subtitleAccentDisplay}; width: 44px; height: 4px; border-radius: 4px; background: var(--orange); margin: var(--sp-md) 0 var(--sp-lg); }

/* \uCE74\uB4DC \uACF5\uD1B5 \u2014 \uC5F0\uD55C \uD14C\uB450\uB9AC, \uBD80\uB4DC\uB7EC\uC6B4 \uADF8\uB9BC\uC790, \uB113\uC740 \uC5EC\uBC31 */
.card {
  border-radius: var(--r-card);
  padding: ${cardPadding};
  margin: ${blockGap} 0;
  background: ${cardBg};
  border: 1px solid var(--hairline);
  box-shadow: ${cardShadow};
}
.card-label {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 13px; font-weight: 700; letter-spacing: .02em;
  color: var(--navy);
  margin: 0 0 var(--sp-md);
}
.card-label::before {
  content: ""; width: 9px; height: 9px; border-radius: 3px; background: var(--navy);
}

/* \uC758\uBBF8 \uD1A4 \u2014 \uC88C\uCE21 \uAD75\uC740 \uC120 \uB300\uC2E0 \uC5F0\uD55C \uBC30\uACBD + \uD3EC\uC778\uD2B8 */
.tone-emphasis { background: var(--emphasis-bg); border-color: var(--emphasis-line); }
.tone-emphasis .card-label { color: var(--orange); }
.tone-emphasis .card-label::before { background: var(--orange); }
.tone-info { background: var(--info-bg); border-color: var(--info-line); }
.tone-info .card-label { color: #128799; }
.tone-info .card-label::before { background: var(--cyan); }
.tone-neutral { background: #fff; }
.tone-neutral .card-label { color: var(--navy); }

/* \uAD6C\uBD84\uC120 (Divider) */
.divider { border: 0; border-top: 1px solid #E5E7EB; margin: 24px 0; }

/* \uC778\uB77C\uC778 \uAC15\uC870 (Highlight) */
mark.hl { background: #FEF08A; color: #111827; padding: 0 2px; border-radius: 3px; }

/* \uC778\uB77C\uC778 \uD0DC\uADF8 (Tag) \u2014 DS 03/04 */
.tag-inline { display: inline-block; background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE; border-radius: 6px; padding: 1px 8px; font-size: .85em; font-weight: 600; line-height: 1.5; }

/* \uCF54\uB4DC \uBE14\uB85D (Code Block) \u2014 DS 04/04 */
.code { border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; margin: 16px 0; }
.code-hd { background: #F3F4F6; padding: 8px 14px; font-size: 12px; color: #6B7280; font-weight: 600; }
.code-pre { background: #F8FAFC; margin: 0; padding: 14px; font-family: "SF Mono", Consolas, monospace; font-size: 13px; line-height: 1.6; color: #334155; white-space: pre-wrap; word-break: break-word; }

/* \uCC28\uD2B8 (Chart) \u2014 DS 04/04, \uCF58\uD150\uCE20 \uD3ED\xB7\uC911\uC559 \uC815\uB82C */
.chart { max-width: 520px; margin: 18px auto; background: #fff; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 18px; }
.chart-title { font-size: 15px; font-weight: 700; color: #111827; }
.chart-unit { font-size: 12px; color: #6B7280; margin: 2px 0 8px; }
.donut-wrap { display: flex; gap: 20px; align-items: center; justify-content: center; flex-wrap: wrap; }
.donut-legend { display: flex; flex-direction: column; gap: 8px; font-size: 13px; color: #374151; }
.donut-legend .lg i { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 7px; }

/* \uC218\uCE58 \uCE74\uB4DC (Metric/Stats) \u2014 DS 02/04 */
.stats { display: flex; flex-wrap: wrap; gap: 14px; margin: 16px 0; }
.stat { flex: 1 1 0; min-width: 120px; background: #fff; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 18px; text-align: center; }
.stat-ic { width: 40px; height: 40px; border-radius: 10px; background: #EFF6FF; color: #2563EB; display: inline-flex; align-items: center; justify-content: center; font-size: 18px; margin-bottom: 8px; }
.stat-v { font-size: 26px; font-weight: 800; color: #111827; margin-bottom: 2px; }
.stat-l { font-size: 12px; color: #6B7280; }

/* \uD0C0\uC784\uB77C\uC778 (Timeline) \u2014 DS 02/04 */
.timeline { position: relative; padding-left: 22px; }
.timeline::before { content: ""; position: absolute; left: 5px; top: 6px; bottom: 6px; width: 2px; background: #DBE7FB; }
.tl-item { position: relative; padding: 0 0 16px; }
.tl-item:last-child { padding-bottom: 0; }
.tl-item::before { content: ""; position: absolute; left: -22px; top: 3px; width: 11px; height: 11px; border-radius: 50%; background: #fff; border: 2px solid #2563EB; }
.tl-date { font-size: 12px; color: #9CA3AF; }
.tl-title { font-weight: 700; font-size: 15px; color: #111827; }
.tl-desc { color: #6B7280; font-size: 14px; line-height: 1.6; }

/* \uD45C \u2014 \uCD9C\uD310\uD615(\uD5E4\uB354 \uAC15\uC870 \xB7 \uBC00\uB3C4 \xB7 \uAC00\uB3C5\uC131) */
.tbl { border: 1px solid ${tblBorder}; border-radius: 12px; overflow: hidden; }
table { width: 100%; border-collapse: collapse; font-size: 15px; line-height: 1.5; }
th, td { padding: 12px 16px; text-align: left; vertical-align: top; word-break: keep-all; overflow-wrap: anywhere; }
th {
  background: ${thBg}; color: var(--navy);
  font-weight: 800; font-size: 13.5px; letter-spacing: .01em; white-space: nowrap;
  border-bottom: 2px solid var(--navy);
}
td { border-bottom: 1px solid #eef1f7; color: #333b50; }
tbody tr:nth-child(even) td { background: #f8fafc; }
tbody tr:hover td { background: ${rowHover}; }
tr:last-child td { border-bottom: none; }
td:first-child { font-weight: 700; color: var(--navy); white-space: nowrap; }

/* ===== Table (DS 01/04) \u2014 \uC5F0\uD68C\uC0C9 \uD5E4\uB354 \xB7 border \xB7 radius 8 \xB7 soft shadow ===== */
[data-type="TableCard"].card, [data-type="CompareCard"].card {
  background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 24px; margin: 24px 0;
}
[data-type="TableCard"] .card-label, [data-type="CompareCard"] .card-label {
  font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 16px;
}
[data-type="TableCard"] .card-label::before, [data-type="CompareCard"] .card-label::before { display: none; }
[data-type="TableCard"] .tbl, [data-type="CompareCard"] .tbl {
  border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;
}
[data-type="TableCard"] table, [data-type="CompareCard"] table {
  width: 100%; border-collapse: collapse; font-size: 15px; line-height: 1.5;
}
[data-type="TableCard"] th, [data-type="CompareCard"] th {
  background: #F3F4F6; color: #374151; font-weight: 600; font-size: 14px;
  padding: 14px 16px; text-align: left; border-bottom: 1px solid #E5E7EB; border-right: 1px solid #E5E7EB;
}
[data-type="TableCard"] th:last-child, [data-type="CompareCard"] th:last-child { border-right: 0; }
[data-type="TableCard"] td, [data-type="CompareCard"] td {
  padding: 14px 16px; color: #111827; border-bottom: 1px solid #E5E7EB; border-right: 1px solid #E5E7EB;
  vertical-align: top; word-break: keep-all; overflow-wrap: anywhere;
}
[data-type="TableCard"] td:last-child, [data-type="CompareCard"] td:last-child { border-right: 0; }
[data-type="TableCard"] tbody tr:last-child td, [data-type="CompareCard"] tbody tr:last-child td { border-bottom: 0; }
[data-type="TableCard"] td:first-child, [data-type="CompareCard"] td:first-child { font-weight: 600; color: #111827; }

/* \uCCB4\uD06C\uB9AC\uC2A4\uD2B8 \u2014 \uC2E4\uCC9C \uCE74\uB4DC */
.checklist { list-style: none; padding-left: 0; margin: 0; }
.checklist li { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px dashed #eef1f6; font-size: var(--fs-body); color: #2f384d; }
.checklist li:last-child { border-bottom: none; }
.cbox { flex: 0 0 auto; width: 22px; height: 22px; border-radius: ${r.checkboxRadius}px; border: 2px solid var(--cyan); background: #f3fcfd; }

/* Steps \u2014 \uB2E8\uACC4 \uD50C\uB85C\uC6B0 */
.steps { list-style: none; counter-reset: step; margin: 0; padding: 0; }
.steps li { counter-increment: step; position: relative; padding: 0 0 var(--sp-lg) 52px; }
.steps li:not(:last-child)::after {
  content: ""; position: absolute; left: 17px; top: 36px; bottom: 4px; width: 2px; background: var(--info-line);
}
.steps li::before {
  content: counter(step); position: absolute; left: 0; top: 0;
  width: 36px; height: 36px; border-radius: 50%; box-sizing: border-box;
  background: ${badgeBg}; color: ${badgeColor}; border: ${badgeBorder}; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  box-shadow: ${stepsBadgeShadow};
}
.steps li > span { display: inline-block; padding-top: 7px; }

/* \uBAA9\uCC28 */
.toc { list-style: none; padding-left: 0; margin: 0; }
.toc li { display: flex; gap: 14px; padding: 14px 4px; border-bottom: 1px solid #f0f2f7; font-size: var(--fs-body); }
.toc .toc-num { color: var(--orange); font-weight: 800; min-width: 28px; }

/* Before / After */
.before-after { display: flex; gap: var(--sp-md); }
.before-after > div { flex: 1; border-radius: 12px; padding: var(--sp-md); background: #fff; border: 1px solid var(--neutral-line); }
.ba-before { border-top: 3px solid var(--gray); }
.ba-after { border-top: 3px solid var(--cyan); }
.ba-label { font-weight: 700; font-size: 12px; letter-spacing: .04em; text-transform: uppercase; margin-bottom: 6px; }
.ba-before .ba-label { color: var(--gray); }
.ba-after .ba-label { color: #128799; }

/* Prompt */
.prompt { background: #0f1830; border-radius: 12px; padding: var(--sp-md) var(--sp-lg); }
.prompt pre { margin: 0; white-space: pre-wrap; font-family: "SFMono-Regular", Consolas, monospace; font-size: 14px; color: #d9e2f3; line-height: 1.6; }

/* Quote \u2014 \uAE30\uBCF8(Modern Glass \uD3EC\uD568 stack \uD14C\uB9C8): \uCC28\uBD84\uD55C \uC778\uC6A9 \uCE74\uB4DC */
.quote { margin: var(--sp-lg) 0; padding: var(--sp-lg) var(--sp-xl); background: #f7f8fb; border: 1px solid var(--hairline); border-left: 3px solid var(--cyan); border-radius: 12px; }
.quote p { margin: 0; font-size: var(--fs-emphasis); line-height: 1.6; color: #2f3a52; }

/* FAQ */
.faq-item { padding: var(--sp-sm) 0; border-bottom: 1px solid #eef1f6; }
.faq-item:last-child { border-bottom: none; }
.faq-q { font-weight: 700; color: var(--navy); }
.faq-a { margin: 6px 0 0; color: #475068; }

/* Warning / Result */
.tone-emphasis[data-type="WarningCard"] .card-label::before { border-radius: 50%; }
.result-badge { display:inline-flex; align-items:center; gap:8px; }
.result-badge::before { content: "\u2713"; display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; border-radius:50%; background: var(--orange); color:#fff; font-size:13px; font-weight:800; }

/* \uC774\uBBF8\uC9C0 \uC2AC\uB86F \u2014 \uD45C\uC9C0/\uCC55\uD130 \uC774\uBBF8\uC9C0 \uC790\uB9AC */
.image-slot { padding: 0; overflow: hidden; border: none; background: transparent; box-shadow: none; }
.slot-frame {
  border-radius: 16px;
  background: linear-gradient(135deg, #eef6f8 0%, #f4f0ff 100%);
  border: 1px solid var(--info-line);
  min-height: 180px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 6px; text-align: center; padding: var(--sp-xl);
}
.slot-icon { width: 46px; height: 46px; border-radius: 12px; background: #fff; box-shadow: 0 6px 16px rgba(31,45,90,.10); display:flex; align-items:center; justify-content:center; }
.slot-icon::before { content:""; width: 22px; height: 16px; border-radius: 3px; border: 2px solid var(--cyan); }
.slot-tag { font-size: 11px; letter-spacing: .18em; color: #128799; font-weight: 700; }
.slot-meta { font-size: var(--fs-caption); color: var(--gray); margin-top: 2px; }
.slot-prompt { font-size: var(--fs-body); color: #41506e; margin-top: 8px; max-width: 80%; }

${V3_CSS}

/* ===== \uD398\uC774\uC9C0 \uBCF8\uBB38 \uCEE8\uD14C\uC774\uB108 ===== */
.page-body.grid-stack { display: block; }
${r.gridStyle === "bento" ? BENTO_V2_CSS : ""}
${r.variant === "editorial" ? EDITORIAL_CSS : ""}
${r.variant === "dashboard" ? DASHBOARD_CSS : ""}
`.trim();
  }
  var BENTO_V2_CSS = `
/* ===== Bento Grid ===== */
.page-body.grid-bento {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sp-lg);
  align-items: stretch;
}
.grid-bento > div { margin: 0; }
.grid-bento > .card { height: 100%; }
/* \uD070 \uCE74\uB4DC(2\uC5F4 span) */
.grid-bento > [data-type="TitleBlock"],
.grid-bento > [data-type="SubtitleBlock"],
.grid-bento > [data-type="AuthorBlock"],
.grid-bento > [data-type="ChapterHeading"],
.grid-bento > [data-type="ParagraphBlock"],
.grid-bento > [data-type="CopyrightNotice"],
.grid-bento > [data-type="TableOfContentsList"],
.grid-bento > [data-type="TableCard"],
.grid-bento > [data-type="CompareCard"],
.grid-bento > [data-type="ResultCard"],
.grid-bento > [data-type="ImageBlock"] { grid-column: 1 / -1; }
/* \uC791\uC740 \uCE74\uB4DC(1\uC5F4 \uD0C0\uC77C): Checklist / Steps / Prompt / FAQ / BeforeAfter / Warning */

/* (1) ChapterHeading \u2014 Hero Card */
.grid-bento [data-type="ChapterHeading"] {
  position: relative;
  background: radial-gradient(120% 140% at 0% 0%, #eaf0ff 0%, #ffffff 60%);
  border: 1px solid #e4e9f5;
  border-radius: var(--r-card);
  padding: 64px var(--sp-xl) 56px;
}
.grid-bento [data-type="ChapterHeading"]::before {
  content: "CHAPTER"; display: inline-block;
  font-size: 12px; font-weight: 800; letter-spacing: .22em; color: var(--cyan);
  margin-bottom: var(--sp-md);
}
.grid-bento [data-type="ChapterHeading"] .ty-chapter {
  font-size: 44px; line-height: 1.1; letter-spacing: -0.03em; margin: 0;
}

/* (2) ResultCard \u2014 \uAC00\uC7A5 \uAC15\uD55C \uD558\uC774\uB77C\uC774\uD2B8 \uCE74\uB4DC */
.grid-bento [data-type="ResultCard"].card {
  background: linear-gradient(135deg, #fff3e8 0%, #ffe7d2 100%);
  border: 1px solid #f7d3b1; border-radius: var(--r-card);
  padding: var(--sp-xl) var(--sp-xl);
}
.grid-bento [data-type="ResultCard"] .card-label {
  font-size: 13px; letter-spacing: .14em; text-transform: uppercase; color: var(--orange);
}
.grid-bento [data-type="ResultCard"] .card-label::before {
  content: "\u2605"; width: 26px; height: 26px; border-radius: 50%;
  background: var(--orange); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 13px;
}
.grid-bento [data-type="ResultCard"] .ty-body {
  font-size: 26px; line-height: 1.35; font-weight: 750; color: #6a3410; margin-top: var(--sp-sm);
}

/* (3) ChecklistCard \u2014 \uC2E4\uCC9C \uCE74\uB4DC \uBB36\uC74C */
.grid-bento [data-type="ChecklistCard"] .checklist { display: flex; flex-direction: column; gap: 10px; }
.grid-bento [data-type="ChecklistCard"] .checklist li {
  border: 1px solid #e7ecf4; border-radius: 12px; background: #fff;
  padding: 14px 16px; gap: 14px; border-bottom: 1px solid #e7ecf4;
}
.grid-bento [data-type="ChecklistCard"] .cbox {
  width: 26px; height: 26px; border-radius: 8px; border: 0;
  background: var(--cyan); position: relative;
}
.grid-bento [data-type="ChecklistCard"] .cbox::after {
  content: "\u2713"; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 15px; font-weight: 800;
}

/* (4) StepsCard \u2014 \uD50C\uB85C\uC6B0 \uCE74\uB4DC */
.grid-bento [data-type="StepsCard"] .steps li { padding-left: 60px; padding-bottom: var(--sp-lg); }
.grid-bento [data-type="StepsCard"] .steps li::before {
  width: 42px; height: 42px; font-size: 16px;
  background: linear-gradient(135deg, var(--cyan), #128799); color: #fff; border: 0;
  box-shadow: 0 6px 14px rgba(31,182,201,.4);
}
.grid-bento [data-type="StepsCard"] .steps li:not(:last-child)::after {
  left: 20px; top: 44px; width: 2px; background: linear-gradient(var(--cyan), transparent);
}
.grid-bento [data-type="StepsCard"] .steps li > span {
  display: block; background: #f7fbfc; border: 1px solid #e1f1f4; border-radius: 12px;
  padding: 12px 14px; padding-top: 12px;
}

/* (5) CompareCard \u2014 VS \uBE44\uAD50 \uAD6C\uC870 (\uD45C\uB97C \uCEEC\uB7FC\uD615\uC73C\uB85C \uC7AC\uD574\uC11D) */
.grid-bento [data-type="CompareCard"] .tbl { border: 0; }
.grid-bento [data-type="CompareCard"] table { border-spacing: 10px 0; border-collapse: separate; }
.grid-bento [data-type="CompareCard"] th {
  background: #11182b; color: #fff; border-radius: 12px 12px 0 0; text-align: center; font-size: 13px;
}
.grid-bento [data-type="CompareCard"] td {
  background: #fff; border: 1px solid #e7ecf4; text-align: center; border-bottom: 1px solid #e7ecf4;
}
.grid-bento [data-type="CompareCard"] td:first-child { font-weight: 800; color: var(--navy); background: #f6f8fc; }

/* (6) TableCard \u2014 row card (\uC5D1\uC140 \uB290\uB08C \uC81C\uAC70) */
.grid-bento [data-type="TableCard"] .tbl { border: 0; overflow: visible; }
.grid-bento [data-type="TableCard"] thead { display: none; }
.grid-bento [data-type="TableCard"] table,
.grid-bento [data-type="TableCard"] tbody,
.grid-bento [data-type="TableCard"] tr,
.grid-bento [data-type="TableCard"] td { display: block; }
.grid-bento [data-type="TableCard"] tbody { display: flex; flex-direction: column; gap: 10px; }
.grid-bento [data-type="TableCard"] tr {
  border: 1px solid #e7ecf4; border-radius: 12px; background: #fff; padding: 14px 16px;
  display: flex; flex-wrap: wrap; gap: 6px 18px; align-items: baseline;
}
.grid-bento [data-type="TableCard"] td { border: 0; padding: 0; color: #4a5468; }
.grid-bento [data-type="TableCard"] td:first-child { font-weight: 800; color: var(--navy); font-size: var(--fs-emphasis); width: 100%; }

/* (7) WarningCard \u2014 \uC778\uC0AC\uC774\uD2B8 \uCE74\uB4DC(\uBD80\uB4DC\uB7FD\uAC8C) */
.grid-bento [data-type="WarningCard"].card {
  background: #fbf6ee; border: 1px solid #efe2cc; border-radius: var(--r-card);
}
.grid-bento [data-type="WarningCard"] .card-label { color: #b9772a; }
.grid-bento [data-type="WarningCard"] .card-label::before {
  content: "i"; width: 22px; height: 22px; border-radius: 50%;
  background: #e7a14e; color: #fff; display: inline-flex; align-items: center; justify-content: center;
  font-style: italic; font-weight: 800; font-size: 13px;
}

/* (8) ImageBlock \u2014 \uB300\uD45C \uBE44\uC8FC\uC5BC \uC790\uB9AC */
.grid-bento [data-type="ImageBlock"] .slot-frame {
  min-height: 240px;
  background: linear-gradient(135deg, #e9f2ff 0%, #f3ecff 50%, #ffeef4 100%);
  border: 1px solid #e2e6f0; border-radius: var(--r-card);
}
.grid-bento [data-type="ImageBlock"] .slot-icon { width: 56px; height: 56px; border-radius: 16px; }
.grid-bento [data-type="ImageBlock"] .slot-tag { font-size: 12px; color: var(--navy); }

/* (9b) QuoteBlock \u2014 \uAC15\uD55C \uBA54\uC2DC\uC9C0 / SNS \uBB38\uAD6C \uCE74\uB4DC */
.grid-bento > [data-type="QuoteBlock"] { grid-column: 1 / -1; }
.grid-bento [data-type="QuoteBlock"] .quote {
  background: linear-gradient(135deg, #11182b 0%, #1f2d5a 100%);
  border: 0; border-radius: var(--r-card); padding: var(--sp-xl); text-align: center;
}
.grid-bento [data-type="QuoteBlock"] .quote p {
  color: #fff; font-size: 28px; font-weight: 750; line-height: 1.4; letter-spacing: -0.01em;
}
`.trim();
  var EDITORIAL_CSS = `
/* ===== Editorial \uC77D\uAE30 \uCEEC\uB7FC ===== */
.page-body.var-editorial { max-width: 680px; margin: 0 auto; }
.var-editorial > div { margin-bottom: var(--sp-lg); }

/* \uB9E4\uAC70\uC9C4 \uC138\uB9AC\uD504 \uC81C\uBAA9 */
.var-editorial .ty-title,
.var-editorial .ty-chapter {
  font-family: Georgia, "Noto Serif KR", "Apple SD Gothic Neo", serif; letter-spacing: -0.01em;
}

/* (7) \uBCF8\uBB38 \uAC00\uB3C5\uC131 \uAC15\uD654 */
.var-editorial [data-type="ParagraphBlock"] .ty-body {
  font-size: 18px; line-height: 1.95; color: #2c2a26; letter-spacing: .01em; margin: 0 0 var(--sp-lg);
}

/* (6) ChapterHeading \u2014 \uB9E4\uAC70\uC9C4 \uD2B9\uC9D1 \uC2DC\uC791 */
.var-editorial [data-type="ChapterHeading"] {
  text-align: center; padding: var(--sp-xxl) 0 var(--sp-xl); border-bottom: 1px solid #e3ded5;
}
.var-editorial [data-type="ChapterHeading"]::before {
  content: "FEATURE"; display: block; font-size: 11px; letter-spacing: .34em; color: #b0855a;
  font-weight: 700; margin-bottom: var(--sp-md);
}
.var-editorial [data-type="ChapterHeading"] .ty-chapter { font-size: 46px; line-height: 1.15; margin: 0; }

/* (8) QuoteBlock \u2014 \uC7A1\uC9C0 \uC778\uC6A9\uBB38 */
.var-editorial [data-type="QuoteBlock"] .quote {
  background: transparent; border: 0; border-left: 3px solid var(--orange); border-radius: 0;
  padding: var(--sp-md) 0 var(--sp-md) var(--sp-lg); margin: var(--sp-xl) 0;
}
.var-editorial [data-type="QuoteBlock"] .quote p {
  font-family: Georgia, "Noto Serif KR", serif; font-size: 28px; line-height: 1.5; font-style: italic; color: var(--navy);
}

/* (9) ResultCard \u2014 \uAE30\uC0AC \uD558\uB2E8 \uD575\uC2EC \uC694\uC57D \uBC15\uC2A4 */
.var-editorial [data-type="ResultCard"].card {
  background: #fbfaf7; border: 1px solid #e3ded5; border-top: 3px solid var(--navy);
  border-radius: 4px; padding: var(--sp-lg) var(--sp-xl);
}
.var-editorial [data-type="ResultCard"] .card-label {
  letter-spacing: .18em; text-transform: uppercase; color: var(--navy); font-size: 12px;
}
.var-editorial [data-type="ResultCard"] .card-label::before { display: none; }
.var-editorial [data-type="ResultCard"] .ty-body {
  font-family: Georgia, "Noto Serif KR", serif; font-size: 20px; line-height: 1.6; color: #2c2a26;
}

/* (10) Checklist / Steps \u2014 \uCC28\uBD84\uD55C \uC2E4\uD589 \uAC00\uC774\uB4DC */
.var-editorial [data-type="ChecklistCard"].card,
.var-editorial [data-type="StepsCard"].card {
  border: 0; border-top: 1px solid #e3ded5; border-radius: 0; background: transparent; padding: var(--sp-lg) 0;
}
.var-editorial [data-type="ChecklistCard"] .cbox { border-color: #b0855a; background: transparent; border-radius: 3px; }
.var-editorial [data-type="StepsCard"] .steps li::before {
  background: transparent; color: var(--navy); border: 1px solid #c9c2b4; box-shadow: none;
}
.var-editorial [data-type="StepsCard"] .steps li:not(:last-child)::after { background: #e3ded5; }

/* (11) Table / Compare \u2014 \uB9AC\uD3EC\uD2B8 \uD45C */
.var-editorial .tbl { border: 0; border-top: 2px solid var(--navy); border-bottom: 1px solid #d8d2c6; border-radius: 0; }
.var-editorial th {
  background: transparent; color: var(--navy); border-bottom: 1px solid #c9c2b4;
  text-transform: uppercase; font-size: 12px; letter-spacing: .06em;
}
.var-editorial td { border-bottom: 1px solid #ece7dd; }

/* (12) WarningCard \u2014 \uD3B8\uC9D1\uC790 \uC8FC / \uC8FC\uC758 \uBA54\uBAA8 */
.var-editorial [data-type="WarningCard"].card {
  background: transparent; border: 0; border-left: 2px solid #b0855a; border-radius: 0;
  padding: 4px 0 4px var(--sp-lg); font-style: italic; color: #5a5347;
}
.var-editorial [data-type="WarningCard"] .card-label { color: #b0855a; font-style: normal; }
.var-editorial [data-type="WarningCard"] .card-label::before { display: none; }

/* (13) ImageBlock \u2014 \uC7A1\uC9C0 \uC774\uBBF8\uC9C0 \uCEA1\uC158 \uC601\uC5ED */
.var-editorial [data-type="ImageBlock"] .slot-frame { background: #efece5; border: 0; border-radius: 4px; min-height: 220px; }
.var-editorial [data-type="ImageBlock"] .slot-prompt { font-style: italic; color: #6a6356; font-size: 14px; }
.var-editorial [data-type="ImageBlock"] .slot-tag { color: #b0855a; }
`.trim();
  var DASHBOARD_CSS = `
/* ===== Dashboard \uAE30\uBCF8 \uBA74 ===== */
.var-dashboard { --panel: #ffffff; --line: #e7eaef; --muted: #6b7280; --ok: #1f9d57; }
.var-dashboard > div { margin-bottom: var(--sp-md); }
.var-dashboard .card { box-shadow: 0 1px 2px rgba(16,24,40,.04); border-color: var(--line); }
.var-dashboard .card-label { font-size: 12px; letter-spacing: .04em; text-transform: uppercase; color: var(--muted); }

/* (1) ChapterHeading \u2014 \uB300\uC2DC\uBCF4\uB4DC \uD398\uC774\uC9C0 \uD5E4\uB354 */
.var-dashboard [data-type="ChapterHeading"] {
  border-bottom: 1px solid var(--line); padding: 0 0 var(--sp-md); margin-bottom: var(--sp-md);
}
.var-dashboard [data-type="ChapterHeading"]::before {
  content: "SECTION"; display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: .14em;
  color: #fff; background: var(--navy); border-radius: 5px; padding: 3px 8px; margin-bottom: 10px;
}
.var-dashboard [data-type="ChapterHeading"] .ty-chapter { font-size: 26px; margin: 0; }

/* (2) ResultCard \u2014 KPI \uCE74\uB4DC */
.var-dashboard [data-type="ResultCard"].card {
  background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
  border: 1px solid #d8e6f7; border-left: 4px solid var(--cyan); border-radius: 12px;
}
.var-dashboard [data-type="ResultCard"] .card-label { color: var(--cyan); }
.var-dashboard [data-type="ResultCard"] .card-label::before { content: "KPI"; background: var(--cyan); color:#fff; width:auto; height:auto; border-radius:4px; padding:2px 6px; font-size:10px; font-weight:800; }
.var-dashboard [data-type="ResultCard"] .ty-body { font-size: 22px; font-weight: 750; color: var(--navy); margin-top: 6px; }

/* (3) ChecklistCard \u2014 task / todo \uD328\uB110 */
.var-dashboard [data-type="ChecklistCard"] .card-label::after { content: " \xB7 TODO"; color: var(--muted); }
.var-dashboard [data-type="ChecklistCard"] .checklist { display: flex; flex-direction: column; gap: 6px; }
.var-dashboard [data-type="ChecklistCard"] .checklist li {
  border: 1px solid var(--line); border-radius: 8px; background: #fbfcfe; padding: 10px 12px; gap: 12px;
}
.var-dashboard [data-type="ChecklistCard"] .cbox { width: 20px; height: 20px; border-radius: 6px; border: 2px solid #c4ccd6; background: #fff; }

/* (4) StepsCard \u2014 workflow / pipeline */
.var-dashboard [data-type="StepsCard"] .steps li::before {
  border-radius: 7px; width: 34px; height: 34px; background: var(--navy); color: #fff; border: 0; box-shadow: none; font-size: 14px;
}
.var-dashboard [data-type="StepsCard"] .steps li:not(:last-child)::after { left: 16px; background: #cdd5e0; }
.var-dashboard [data-type="StepsCard"] .steps li > span {
  display: block; background: #f7f9fc; border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px;
}

/* (5) CompareCard \u2014 decision matrix */
.var-dashboard [data-type="CompareCard"] .card-label::after { content: " \xB7 DECISION MATRIX"; color: var(--muted); }
.var-dashboard [data-type="CompareCard"] .tbl { border: 1px solid var(--line); border-radius: 10px; }
.var-dashboard [data-type="CompareCard"] th { background: #eef2f8; color: var(--navy); border-bottom: 1px solid var(--line); }
.var-dashboard [data-type="CompareCard"] td { border-bottom: 1px solid #eef1f5; }
.var-dashboard [data-type="CompareCard"] td:first-child { font-weight: 700; color: var(--navy); background: #f8fafc; }

/* (6) TableCard \u2014 database table */
.var-dashboard [data-type="TableCard"] .tbl { border: 1px solid var(--line); border-radius: 10px; }
.var-dashboard [data-type="TableCard"] th { background: #f3f5f9; color: var(--muted); text-transform: uppercase; font-size: 11px; letter-spacing: .06em; border-bottom: 1px solid var(--line); }
.var-dashboard [data-type="TableCard"] td { border-bottom: 1px solid #eef1f5; }
.var-dashboard [data-type="TableCard"] tbody tr:nth-child(even) td { background: #fafbfd; }

/* (7) WarningCard \u2014 risk / alert \uD328\uB110 */
.var-dashboard [data-type="WarningCard"].card {
  background: #fff8f1; border: 1px solid #f3dcc2; border-left: 4px solid var(--orange); border-radius: 10px;
}
.var-dashboard [data-type="WarningCard"] .card-label { color: var(--orange); }
.var-dashboard [data-type="WarningCard"] .card-label::before { content: "!"; background: var(--orange); color: #fff; width: 18px; height: 18px; border-radius: 5px; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; }

/* (8) QuoteBlock \u2014 insight / note \uD328\uB110 */
.var-dashboard [data-type="QuoteBlock"] .quote {
  background: #f6f8fb; border: 1px solid var(--line); border-left: 4px solid var(--navy); border-radius: 10px; padding: var(--sp-md) var(--sp-lg);
}
.var-dashboard [data-type="QuoteBlock"] .quote::before {
  content: "NOTE"; display: block; font-size: 10px; font-weight: 800; letter-spacing: .14em; color: var(--muted); margin-bottom: 6px;
}
.var-dashboard [data-type="QuoteBlock"] .quote p { font-size: var(--fs-body); font-style: normal; color: #374151; }

/* (9) ImageBlock \u2014 dashboard widget / preview */
.var-dashboard [data-type="ImageBlock"] .slot-frame {
  background: repeating-linear-gradient(45deg, #f4f6fa, #f4f6fa 12px, #eef1f6 12px, #eef1f6 24px);
  border: 1px solid var(--line); border-radius: 10px; min-height: 200px;
}
.var-dashboard [data-type="ImageBlock"] .slot-tag { content: ""; color: var(--muted); }
.var-dashboard [data-type="ImageBlock"] .slot-tag::after { content: " \xB7 WIDGET"; }
`.trim();
  var V3_CSS = `
/* \uBCF8\uBB38 \uD0C0\uC774\uD3EC (Body 16 / 1.7) */
.grid-stack .ty-body { font-size: 16px; line-height: 1.7; color: var(--v3-g900); }

/* \uACF5\uD1B5 \u2014 \uCE74\uB4DC \uD06C\uAC8C(\uC5EC\uBC31\xB7\uB77C\uC6B4\uB4DC), \uC139\uC158 \uB77C\uBCA8(eyebrow) */
.grid-stack [data-type="ChecklistCard"].card,
.grid-stack [data-type="FAQCard"].card,
.grid-stack [data-type="BeforeAfterCard"].card,
.grid-stack [data-type="StepsCard"].card,
.grid-stack [data-type="ResultCard"].card,
.grid-stack [data-type="WarningCard"].card { padding: 28px; border-radius: 20px; margin: 24px 0; box-shadow: 0 1px 3px rgba(13,27,61,.04); }
.grid-stack [data-type="BeforeAfterCard"].card::before,
.grid-stack [data-type="StepsCard"].card::before,
.grid-stack [data-type="ResultCard"].card::before { display: block; font-size: 11px; letter-spacing: .2em; font-weight: 800; margin-bottom: 10px; }

/* Checklist (DS 01/04) \u2014 \uC138\uB85C \uB098\uC5F4 + \uC88C\uCE21 \uCCB4\uD06C\uBC15\uC2A4 */
[data-type="ChecklistCard"].card { background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 24px; }
[data-type="ChecklistCard"] .card-label { color: #111827; font-size: 18px; font-weight: 700; margin-bottom: 16px; }
[data-type="ChecklistCard"] .card-label::before { display: none; }
[data-type="ChecklistCard"] .checklist { display: flex; flex-direction: column; gap: 14px; }
[data-type="ChecklistCard"] .checklist li { background: transparent; border: 0; border-radius: 0; padding: 0; gap: 12px; align-items: center; font-size: 16px; line-height: 1.5; color: #111827; }
[data-type="ChecklistCard"] .cbox { width: 20px; height: 20px; border-radius: 6px; border: 2px solid #D1D5DB; background: #fff; }

/* FAQ (DS 01/04) \u2014 Accordion \uCE74\uB4DC(border, radius 8) */
[data-type="FAQCard"].card { background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 24px; }
[data-type="FAQCard"] .card-label { color: #111827; font-size: 18px; font-weight: 700; margin-bottom: 16px; }
[data-type="FAQCard"] .card-label::before { display: none; }
[data-type="FAQCard"] .faq-item { background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px 18px; margin-bottom: 12px; position: relative; }
[data-type="FAQCard"] .faq-item:last-child { margin-bottom: 0; }
[data-type="FAQCard"] .faq-item::after { content: "\u2304"; position: absolute; right: 18px; top: 14px; color: #6B7280; font-size: 16px; }
[data-type="FAQCard"] .faq-q { color: #111827; font-weight: 600; font-size: 16px; padding-right: 28px; line-height: 1.5; }
[data-type="FAQCard"] .faq-a { color: #6B7280; font-size: 15px; line-height: 1.6; margin-top: 10px; }

/* Before / After \u2014 BEFORE/AFTER \uCE74\uB4DC + \uC911\uC559 \uD654\uC0B4\uD45C */
[data-type="BeforeAfterCard"].card { background: #fff; border: 1px solid #E6E9EF; }
[data-type="BeforeAfterCard"].card::before { content: "BEFORE / AFTER"; color: var(--v3-blue); }
[data-type="BeforeAfterCard"] .card-label { color: var(--v3-primary); font-size: 21px; font-weight: 800; margin-bottom: 20px; }
[data-type="BeforeAfterCard"] .card-label::before { display: none; }
[data-type="BeforeAfterCard"] .before-after { gap: 22px; position: relative; align-items: stretch; }
[data-type="BeforeAfterCard"] .before-after > div { border: 1px solid #E6E9EF; border-radius: 16px; padding: 18px; overflow: hidden; background: #fff; font-size: 16px; line-height: 1.7; color: #374151; }
[data-type="BeforeAfterCard"] .ba-label { margin: -18px -18px 16px; padding: 14px 18px; font-size: 13px; color: #fff; text-transform: uppercase; letter-spacing: .08em; font-weight: 800; }
[data-type="BeforeAfterCard"] .ba-before .ba-label { background: var(--v3-g500); }
[data-type="BeforeAfterCard"] .ba-after .ba-label { background: var(--v3-blue); }
[data-type="BeforeAfterCard"] .before-after::after { content: "\u2192"; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 38px; height: 38px; border-radius: 50%; background: #fff; border: 1px solid #D7DEEA; color: var(--v3-blue); display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; z-index: 2; }

/* Steps \u2014 \uC6D0\uD615 \uBC88\uD638 + \uC5F0\uACB0\uC120 + \uB2E8\uACC4 \uCE74\uB4DC */
[data-type="StepsCard"].card { background: #fff; border: 1px solid #E6E9EF; }
[data-type="StepsCard"].card::before { content: "STEP / PROCESS"; color: var(--v3-blue); }
[data-type="StepsCard"] .card-label { color: var(--v3-primary); font-size: 21px; font-weight: 800; margin-bottom: 20px; }
[data-type="StepsCard"] .card-label::before { display: none; }
[data-type="StepsCard"] .steps li { padding: 0 0 24px 64px; }
[data-type="StepsCard"] .steps li::before { width: 44px; height: 44px; font-size: 17px; background: var(--v3-blue); color: #fff; border: 0; box-shadow: none; }
[data-type="StepsCard"] .steps li:not(:last-child)::after { left: 21px; top: 48px; width: 2px; background: #BBD3FB; }
[data-type="StepsCard"] .steps li > span { display: block; background: #F7FAFF; border: 1px solid #E2EAF6; border-radius: 12px; padding: 14px 16px; font-size: 16px; line-height: 1.6; color: #1f2937; }

/* Quote (DS 01/04) \u2014 \uC88C\uCE21 \uD30C\uB780 \uC138\uB85C\uC120 + blue tint + \uB530\uC634\uD45C \uC544\uC774\uCF58 */
[data-type="QuoteBlock"] .quote { background: #EFF5FF; border: 1px solid #DBE7FB; border-left: 4px solid #2563EB; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 22px 28px 22px 30px; position: relative; margin: 24px 0; }
[data-type="QuoteBlock"] .quote::before { content: "\\201C"; position: absolute; left: 18px; top: 8px; font-family: Georgia, serif; font-size: 44px; line-height: 1; color: #2563EB; }
[data-type="QuoteBlock"] .quote p { font-size: 17px; line-height: 1.6; color: #111827; font-weight: 500; margin: 6px 0 0; padding-left: 18px; }

/* Warning Box (DS 01/04) \u2014 \uC5F0\uB178\uB791 \uBC30\uACBD + \uACBD\uACE0 \uC544\uC774\uCF58 */
[data-type="WarningCard"].card { background: #FFFBEB; border: 1px solid #FDE9B5; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 20px 22px; }
[data-type="WarningCard"].card::before { display: none; }
[data-type="WarningCard"] .card-label { color: #B45309; font-size: 16px; font-weight: 700; margin-bottom: 8px; }
[data-type="WarningCard"] .card-label::before { content: "\u26A0"; background: transparent; color: #F59E0B; width: auto; height: auto; border-radius: 0; font-size: 18px; }

/* Result \u2014 \uD070 \u2605 \uC544\uC774\uCF58 + \uD575\uC2EC \uBB38\uC7A5 */
[data-type="ResultCard"].card { background: #EFF5FF; border: 1px solid #CFE0FB; }
[data-type="ResultCard"].card::before { content: "KEY RESULT"; color: #1D4ED8; }
[data-type="ResultCard"] .card-label { color: #1D4ED8; font-size: 15px; font-weight: 800; letter-spacing: .04em; align-items: center; gap: 12px; }
[data-type="ResultCard"] .result-badge::before { content: "\u2605"; width: 40px; height: 40px; font-size: 20px; border-radius: 12px; background: var(--v3-blue); }
[data-type="ResultCard"] .ty-body { font-size: 20px; line-height: 1.55; color: var(--v3-primary); font-weight: 700; margin-top: 14px; }

/* Result Box \uBCC0\uD615 (DS 10\uCC28) \u2014 Success / Info / Warning / Error. variant \uC5C6\uC73C\uBA74 \uC704 \uAE30\uBCF8(\uD30C\uB791 \u2605) \uC720\uC9C0 */
[data-type="ResultCard"][data-variant="success"].card { background: #F0FDF4; border-color: #BBF7D0; }
[data-type="ResultCard"][data-variant="success"].card::before { content: "SUCCESS"; color: #15803D; }
[data-type="ResultCard"][data-variant="success"] .card-label { color: #15803D; }
[data-type="ResultCard"][data-variant="success"] .result-badge::before { content: "\u2713"; background: #16A34A; }
[data-type="ResultCard"][data-variant="success"] .ty-body { color: #14532D; }
[data-type="ResultCard"][data-variant="info"].card { background: #EFF6FF; border-color: #BFDBFE; }
[data-type="ResultCard"][data-variant="info"].card::before { content: "INFO"; color: #1D4ED8; }
[data-type="ResultCard"][data-variant="info"] .card-label { color: #1D4ED8; }
[data-type="ResultCard"][data-variant="info"] .result-badge::before { content: "\u2139"; background: #3B82F6; }
[data-type="ResultCard"][data-variant="info"] .ty-body { color: #1E3A8A; }
[data-type="ResultCard"][data-variant="warning"].card { background: #FFFBEB; border-color: #FDE9B5; }
[data-type="ResultCard"][data-variant="warning"].card::before { content: "WARNING"; color: #B45309; }
[data-type="ResultCard"][data-variant="warning"] .card-label { color: #B45309; }
[data-type="ResultCard"][data-variant="warning"] .result-badge::before { content: "!"; background: #F59E0B; }
[data-type="ResultCard"][data-variant="warning"] .ty-body { color: #78350F; }
[data-type="ResultCard"][data-variant="error"].card { background: #FEF2F2; border-color: #FECACA; }
[data-type="ResultCard"][data-variant="error"].card::before { content: "ERROR"; color: #B91C1C; }
[data-type="ResultCard"][data-variant="error"] .card-label { color: #B91C1C; }
[data-type="ResultCard"][data-variant="error"] .result-badge::before { content: "\u2715"; background: #EF4444; }
[data-type="ResultCard"][data-variant="error"] .ty-body { color: #7F1D1D; }

/* === \uD1B5\uD569 \uC2A4\uD504\uB9B0\uD2B8 15~30 (\uC815\uC801 \uBCC0\uD658) === */
.cmp { width: 100%; border-collapse: collapse; font-size: 13px; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; margin: 4px 0; }
.cmp th, .cmp td { padding: 10px 12px; text-align: center; border-bottom: 1px solid #E5E7EB; }
.cmp th:first-child, .cmp td:first-child { text-align: left; }
.cmp thead th { background: #F3F4F6; color: #374151; font-weight: 700; }
.cmp thead th.pro { background: #2563EB; color: #fff; }
.cmp td.pro { color: #1D4ED8; font-weight: 700; background: #F5F9FF; }
.cmp tbody tr:last-child td { border-bottom: 0; }
.al { display: flex; gap: 10px; align-items: flex-start; border: 1px solid; border-radius: 8px; padding: 12px 14px; font-size: 14px; }
.al-ic { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; color: #fff; flex: none; }
.al-success { background: #F0FDF4; border-color: #BBF7D0; color: #14532D; } .al-success .al-ic { background: #16A34A; }
.al-info { background: #EFF6FF; border-color: #BFDBFE; color: #1E3A8A; } .al-info .al-ic { background: #3B82F6; }
.al-warning { background: #FFFBEB; border-color: #FDE9B5; color: #78350F; } .al-warning .al-ic { background: #F59E0B; }
.al-error { background: #FEF2F2; border-color: #FECACA; color: #7F1D1D; } .al-error .al-ic { background: #EF4444; }
.proc { display: flex; align-items: stretch; gap: 8px; }
.proc-p { flex: 1; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px 10px; text-align: center; display: flex; flex-direction: column; align-items: center; }
.proc-ic { width: 44px; height: 44px; border-radius: 10px; background: #EFF6FF; color: #2563EB; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-bottom: 10px; }
.proc-t { font-weight: 700; font-size: 13px; color: #111827; }
.proc-d { color: #6B7280; font-size: 11px; margin-top: 4px; line-height: 1.4; }
.proc-arr { display: flex; align-items: center; color: #2563EB; font-weight: 800; font-size: 20px; }
.rating { display: flex; align-items: center; gap: 8px; font-size: 18px; }
.rating .rt-on { color: #F59E0B; letter-spacing: 2px; }
.rating .rt-off { color: #D1D5DB; letter-spacing: 2px; }
.rating .rt-num { font-size: 14px; font-weight: 700; color: #111827; }
.rating .rt-lb { font-size: 13px; color: #6B7280; }
.tag-group, .chip-group { display: flex; flex-wrap: wrap; gap: 8px; }
.tg-tag { background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; border-radius: 6px; padding: 3px 10px; font-size: 13px; }
.cg-chip { background: #F3F4F6; color: #374151; border: 1px solid #E5E7EB; border-radius: 999px; padding: 4px 12px; font-size: 13px; }
.tree { font-size: 14px; color: #374151; }
.tree-row { padding: 3px 0; }
.tree-row .tree-mk { color: #9CA3AF; margin-right: 6px; }
.pgn { display: flex; flex-direction: column; gap: 8px; }
.pgn-dots { display: flex; flex-wrap: wrap; gap: 6px; }
.pgn-dot { min-width: 28px; height: 28px; padding: 0 6px; border: 1px solid #E5E7EB; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; color: #374151; box-sizing: border-box; }
.pgn-dot.on { background: #2563EB; border-color: #2563EB; color: #fff; font-weight: 700; }
.pgn-meta { font-size: 12px; color: #6B7280; }
.empty { border: 1px dashed #D1D5DB; border-radius: 8px; padding: 28px 20px; text-align: center; }
.empty-ic { font-size: 32px; margin-bottom: 8px; }
.empty-t { font-weight: 700; font-size: 15px; color: #111827; }
.empty-d { color: #6B7280; font-size: 13px; margin-top: 4px; }
.srch { display: flex; align-items: center; gap: 8px; border: 1px solid #E5E7EB; border-radius: 8px; padding: 10px 14px; background: #F9FAFB; }
.srch-ic { color: #9CA3AF; }
.srch-q { color: #111827; font-size: 14px; }
.srch-ph { color: #9CA3AF; font-size: 14px; }
.tip-box, .pop-box { border: 1px solid #E5E7EB; border-left: 3px solid #2563EB; border-radius: 8px; padding: 12px 14px; background: #F9FAFB; }
.tip-lb, .pop-t { font-weight: 700; font-size: 13px; color: #1D4ED8; margin-bottom: 4px; }
.tip-tx, .pop-tx { font-size: 14px; color: #374151; line-height: 1.6; }
.modal-card, .drawer-card { border: 1px solid #BFDBFE; border-radius: 8px; padding: 18px 20px; background: #EFF6FF; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
.modal-t, .drawer-t { font-weight: 700; font-size: 15px; color: #1E3A8A; margin-bottom: 6px; }
.modal-tx, .drawer-tx { font-size: 14px; color: #374151; line-height: 1.6; }
.skel { display: flex; flex-direction: column; gap: 10px; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; }
.skel-bar { height: 12px; border-radius: 6px; background: #E5E7EB; }
.file-card { display: flex; align-items: center; gap: 12px; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px 14px; }
.file-ic { font-size: 24px; }
.file-name { font-weight: 700; font-size: 14px; color: #111827; }
.file-sub { font-size: 12px; color: #6B7280; margin-top: 2px; }

/* Timeline Card (DS 04/04, 42) \u2014 \uC88C\uCE21 \uC218\uC9C1\uC120 + \uC6D0\uD615 \uD3EC\uC778\uD2B8 + \uCE74\uB4DC\uD615 \uD56D\uBAA9(\uC544\uC774\uCF58 \uC5C6\uC74C) */
[data-type="TimelineCardList"].card { background: #fff; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 22px; }
[data-type="TimelineCardList"].card::before { display: none; }
.tlc { position: relative; padding-left: 22px; }
.tlc::before { content: ""; position: absolute; left: 5px; top: 6px; bottom: 6px; width: 2px; background: #DBE7FB; }
.tlc .it { position: relative; margin-bottom: 12px; }
.tlc .it:last-child { margin-bottom: 0; }
.tlc .it::before { content: ""; position: absolute; left: -22px; top: 14px; width: 11px; height: 11px; border-radius: 50%; background: #2563EB; border: 2px solid #fff; box-shadow: 0 0 0 1px #2563EB; }
.tlc .ca { border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 12px 14px; }
.tlc .dt { font-size: 11px; color: #9CA3AF; }
.tlc .ti { font-weight: 700; font-size: 14px; color: #111827; margin-top: 2px; }
.tlc .de { color: #6B7280; font-size: 12px; line-height: 1.5; margin-top: 3px; }

/* Progress Stepper (DS 02/04, 15) \u2014 \uC644\uB8CC \u2713 / \uD604\uC7AC / \uC608\uC815 3\uC0C1\uD0DC + \uC5F0\uACB0\uC120 + desc */
[data-type="StepperCard"].card { background: #fff; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 22px 22px 18px; }
[data-type="StepperCard"].card::before { display: none; }
.stp { display: flex; align-items: center; justify-content: space-between; }
.stp .s { display: flex; flex-direction: column; align-items: center; gap: 6px; flex: none; }
.stp .n { width: 30px; height: 30px; border-radius: 50%; border: 2px solid #D1D5DB; color: #9CA3AF; background: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; }
.stp .s.done .n, .stp .s.on .n { background: #2563EB; border-color: #2563EB; color: #fff; }
.stp .l { font-size: 11px; color: #6B7280; }
.stp .s.done .l { color: #374151; }
.stp .s.on .l { color: #111827; font-weight: 700; }
.stp .line { flex: 1; height: 2px; background: #E5E7EB; margin: 0 4px 18px; }
.stp .line.done { background: #2563EB; }
.stp-desc { margin-top: 14px; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px 18px; }
.stp-desc .t { font-weight: 700; font-size: 13px; color: #111827; }
.stp-desc .d { color: #6B7280; font-size: 12px; margin-top: 2px; }

/* Progress (DS 02/04, 20) \u2014 \uC804\uCCB4(\uAD75\uC740 \uB9C9\uB300) + \uC138\uBD80 \uD589, 100% = \uCD08\uB85D \uC644\uB8CC \u2713 */
[data-type="ProgressCard"].card { background: #fff; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 20px 22px; }
[data-type="ProgressCard"].card::before { display: none; }
.pg .pg-row { margin-bottom: 14px; }
.pg .pg-row:last-child { margin-bottom: 0; }
.pg .pg-top { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; color: #374151; }
.pg .pg-val { color: #374151; }
.pg .pg-val.pg-done { color: #16A34A; font-weight: 700; }
.pg .pg-bar { height: 8px; background: #E5E7EB; border-radius: 999px; overflow: hidden; }
.pg .pg-fill { display: block; height: 100%; background: #2563EB; border-radius: 999px; }
.pg .pg-fill.pg-fill-done { background: #16A34A; }
.pg .pg-overall .pg-bar { height: 12px; }
.pg .pg-overall .pg-top { font-size: 14px; }
.pg .pg-overall .pg-label { font-weight: 700; color: #111827; }
.pg .pg-overall .pg-val { font-weight: 700; color: #111827; }
.pg .pg-overall .pg-val.pg-done { color: #16A34A; }

/* Feature Card (DS 02/04, 17) \u2014 \uC544\uC774\uCF58 + \uC81C\uBAA9 + \uC124\uBA85 + \u2713 \uCCB4\uD06C\uB9AC\uC2A4\uD2B8 */
[data-type="FeatureCard"].card { background: #fff; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 20px 22px; }
[data-type="FeatureCard"].card::before { display: none; }
.feat { display: flex; gap: 14px; align-items: flex-start; }
.feat-ic { width: 44px; height: 44px; border-radius: 999px; background: #EFF6FF; color: #2563EB; display: flex; align-items: center; justify-content: center; font-size: 20px; flex: none; }
.feat-body { flex: 1; }
.feat-t { font-weight: 700; font-size: 16px; color: #111827; margin-bottom: 4px; }
.feat-d { color: #6B7280; font-size: 14px; line-height: 1.6; margin: 0 0 10px; }
.feat-ck { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; font-size: 14px; color: #374151; }
.feat-ck li::before { content: "\u2713 "; color: #2563EB; font-weight: 700; }

/* Callout \u2014 Info / Tip / Note (DS 01/04) */
[data-type="CalloutCard"].card { border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 18px 20px; border-left-width: 4px; border-left-style: solid; }
[data-type="CalloutCard"] .card-label { font-size: 15px; font-weight: 800; margin-bottom: 8px; }
[data-type="CalloutCard"] .card-label::before { display: none; }
[data-type="CalloutCard"] .ty-body { font-size: 15px; line-height: 1.6; }
[data-type="CalloutCard"][data-variant="info"] { background: #EFF6FF; border-color: #BFDBFE; border-left-color: var(--v3-blue); }
[data-type="CalloutCard"][data-variant="info"] .card-label { color: #1D4ED8; }
[data-type="CalloutCard"][data-variant="tip"] { background: #F0FDF4; border-color: #BBF7D0; border-left-color: var(--v3-green); }
[data-type="CalloutCard"][data-variant="tip"] .card-label { color: #15803D; }
[data-type="CalloutCard"][data-variant="note"] { background: #F5F3FF; border-color: #DDD6FE; border-left-color: var(--v3-purple); }
[data-type="CalloutCard"][data-variant="note"] .card-label { color: #6D28D9; }
`.trim();
  function renderComponentInner(c) {
    var _a, _b, _c, _d, _e;
    switch (c.type) {
      case "TitleBlock":
        return `<h1 class="ty-title">${esc3(c.text)}</h1>`;
      case "SubtitleBlock":
        return `<div class="subtitle-accent"></div><p class="ty-emphasis">${esc3(c.text)}</p>`;
      case "AuthorBlock":
        return `<p class="ty-caption">${esc3(c.text)}</p>`;
      case "CoverImage":
        return `<img class="cover-image" src="${c.src}" alt="${esc3((_a = c.alt) != null ? _a : "")}" />`;
      case "ChapterHeading":
        return `<h2 class="ty-chapter">Chapter ${c.number}. ${esc3(c.title)}</h2>`;
      case "TableOfContentsList":
        return `<ul class="toc">${c.entries.map((e) => `<li><span class="toc-num">${e.number}</span><span>${esc3(e.title)}</span></li>`).join("")}</ul>`;
      case "CopyrightNotice":
        return `<div class="ty-caption">${nl2br(c.text)}</div>`;
      case "AuthorBio":
        return `<h2 class="ty-chapter">${esc3(c.heading)}</h2><p class="ty-body">${nl2br(c.text)}</p>`;
      case "Disclaimer":
        return `<h2 class="ty-chapter">${esc3(c.heading)}</h2><p class="ty-caption">${nl2br(c.text)}</p>`;
      case "ParagraphBlock":
        return `<p class="ty-body">${inlineHtml(c.text)}</p>`;
      case "QuoteBlock":
        return `<blockquote class="quote"><p>${esc3(c.text)}</p></blockquote>`;
      case "TableCard":
        return `<div class="card-label">\uD45C</div><div class="tbl">${renderTable(c.columns, c.rows)}</div>`;
      case "ChecklistCard":
        return `<div class="card-label">\uCCB4\uD06C\uB9AC\uC2A4\uD2B8</div><ul class="checklist">${c.items.map((i) => `<li><span class="cbox"></span><span>${esc3(i)}</span></li>`).join("")}</ul>`;
      case "CompareCard":
        return `<div class="card-label">\uBE44\uAD50</div><div class="tbl">${renderTable(c.columns, c.rows)}</div>`;
      case "BeforeAfterCard":
        return `<div class="card-label">Before / After</div><div class="before-after"><div class="ba-before"><div class="ba-label">Before</div>${esc3(
          c.before
        )}</div><div class="ba-after"><div class="ba-label">After</div>${esc3(c.after)}</div></div>`;
      case "PromptCard":
        return `<div class="card-label">\uD504\uB86C\uD504\uD2B8</div><div class="prompt"><pre>${esc3(c.text)}</pre></div>`;
      case "StepsCard":
        return `<div class="card-label">\uB2E8\uACC4</div><ol class="steps">${c.items.map((i) => `<li><span>${esc3(i)}</span></li>`).join("")}</ol>`;
      case "FAQCard":
        return `<div class="card-label">FAQ</div>${c.pairs.map((p) => `<div class="faq-item"><div class="faq-q">Q. ${esc3(p.q)}</div><div class="faq-a">A. ${esc3(p.a)}</div></div>`).join("")}`;
      case "WarningCard":
        return `<div class="card-label">\uC54C\uC544\uB450\uAE30</div><div class="ty-body" style="margin:0">${esc3(c.text)}</div>`;
      case "ResultCard": {
        const rLabels = { success: "\uC131\uACF5", info: "\uC815\uBCF4", warning: "\uC8FC\uC758", error: "\uC624\uB958" };
        const rLabel = c.variant ? rLabels[c.variant] : "\uD575\uC2EC \uACB0\uACFC";
        return `<div class="card-label result-badge">${rLabel}</div><div class="ty-body" style="margin:0">${esc3(c.text)}</div>`;
      }
      case "CalloutCard": {
        const labels = { info: "\uC815\uBCF4", tip: "\uD301", note: "\uB178\uD2B8" };
        return `<div class="card-label">${(_b = labels[c.variant]) != null ? _b : "\uC815\uBCF4"}</div><div class="ty-body" style="margin:0">${esc3(c.text)}</div>`;
      }
      case "Divider":
        return `<hr class="divider" />`;
      case "CodeBlock":
        return `<div class="code"><div class="code-hd">${esc3(c.lang || "CODE")}</div><pre class="code-pre">${esc3(c.code)}</pre></div>`;
      case "ChartCard": {
        const head = `${c.title ? `<div class="chart-title">${esc3(c.title)}</div>` : ""}${c.unit ? `<div class="chart-unit">\uB2E8\uC704: ${esc3(c.unit)}</div>` : ""}`;
        if (c.chartType === "donut") {
          const dn = Math.min(c.labels.length, c.values.length);
          const legend = c.labels.slice(0, dn).map((l, i) => `<span class="lg"><i style="background:${DONUT_COLORS[i % DONUT_COLORS.length]}"></i>${esc3(l)} <b>${esc3(String(c.values[i]))}${c.unit ? esc3(c.unit) : ""}</b></span>`).join("");
          return `<div class="chart">${head}<div class="donut-wrap">${buildDonutSvg(c.labels, c.values, c.center, c.unit)}<div class="donut-legend">${legend}</div></div></div>`;
        }
        return `<div class="chart">${head}${buildBarSvg(c.labels, c.values)}</div>`;
      }
      case "StatsCard":
        return `<div class="stats">${c.items.map(
          (it) => `<div class="stat">${it.icon ? `<div class="stat-ic">${esc3(it.icon)}</div>` : ""}<div class="stat-v">${esc3(it.value)}</div><div class="stat-l">${esc3(it.label)}</div></div>`
        ).join("")}</div>`;
      case "TimelineCard":
        return `<div class="card-label">\uD0C0\uC784\uB77C\uC778</div><div class="timeline">${c.items.map(
          (it) => `<div class="tl-item"><div class="tl-date">${esc3(it.date)}</div><div class="tl-title">${esc3(it.title)}</div>${it.desc ? `<div class="tl-desc">${esc3(it.desc)}</div>` : ""}</div>`
        ).join("")}</div>`;
      case "FeatureCard": {
        const ficon = c.icon ? `<div class="feat-ic">${esc3(c.icon)}</div>` : "";
        const fitems = c.items.length ? `<ul class="feat-ck">${c.items.map((it) => `<li>${esc3(it)}</li>`).join("")}</ul>` : "";
        const fdesc = c.desc ? `<div class="feat-d">${esc3(c.desc)}</div>` : "";
        return `<div class="feat">${ficon}<div class="feat-body"><div class="feat-t">${esc3(c.title)}</div>${fdesc}${fitems}</div></div>`;
      }
      case "ProgressCard": {
        const rows = c.items.map((it, i) => {
          const done = it.percent >= 100;
          const valTxt = done ? "\uC644\uB8CC \u2713" : `${it.percent}%`;
          const valCls = done ? " pg-done" : "";
          const fillCls = done ? " pg-fill-done" : "";
          const overall = i === 0 ? " pg-overall" : "";
          return `<div class="pg-row${overall}"><div class="pg-top"><span class="pg-label">${esc3(it.label)}</span><span class="pg-val${valCls}">${valTxt}</span></div><div class="pg-bar"><i class="pg-fill${fillCls}" style="width:${it.percent}%"></i></div></div>`;
        }).join("");
        return `<div class="pg">${rows}</div>`;
      }
      case "StepperCard": {
        const n = c.steps.length;
        if (n === 0) return `<div class="stp"></div>`;
        const cur = c.current;
        let row = "";
        c.steps.forEach((label, idx) => {
          const s = idx + 1;
          const state = s < cur ? "done" : s === cur ? "on" : "todo";
          const mark = state === "done" ? "\u2713" : String(s);
          row += `<div class="s ${state}"><div class="n">${mark}</div><div class="l">${esc3(label)}</div></div>`;
          if (idx < n - 1) row += `<div class="line${s < cur ? " done" : ""}"></div>`;
        });
        const curLabel = (_c = c.steps[cur - 1]) != null ? _c : "";
        const descBox = c.desc ? `<div class="stp-desc"><div class="t">${cur}\uB2E8\uACC4: ${esc3(curLabel)}</div><div class="d">${esc3(c.desc)}</div></div>` : "";
        return `<div class="stp">${row}</div>${descBox}`;
      }
      case "TimelineCardList": {
        if (c.items.length === 0) return `<div class="tlc"></div>`;
        const items = c.items.map(
          (it) => `<div class="it"><div class="ca">${it.date ? `<div class="dt">${esc3(it.date)}</div>` : ""}<div class="ti">${esc3(it.title)}</div>${it.desc ? `<div class="de">${esc3(it.desc)}</div>` : ""}</div></div>`
        ).join("");
        return `<div class="tlc">${items}</div>`;
      }
      case "ComparisonCard": {
        const hi = c.columns.indexOf(c.highlight);
        const head = c.columns.map((col, i) => `<th${i === hi ? ' class="pro"' : ""}>${esc3(col)}</th>`).join("");
        const bodyRows = c.rows.map((r) => `<tr>${r.map((cell, i) => `<td${i === hi ? ' class="pro"' : ""}>${esc3(cell)}</td>`).join("")}</tr>`).join("");
        return `<table class="cmp"><thead><tr>${head}</tr></thead><tbody>${bodyRows}</tbody></table>`;
      }
      case "AlertCard": {
        const L = { success: "\uC131\uACF5", info: "\uC815\uBCF4", warning: "\uACBD\uACE0", error: "\uC624\uB958" };
        const I = { success: "\u2713", info: "i", warning: "!", error: "\u2715" };
        return `<div class="al al-${c.variant}"><span class="al-ic">${(_d = I[c.variant]) != null ? _d : "i"}</span><span class="al-tx"><b>${(_e = L[c.variant]) != null ? _e : "\uC815\uBCF4"}</b> ${esc3(c.text)}</span></div>`;
      }
      case "ProcessCard": {
        if (c.items.length === 0) return `<div class="proc"></div>`;
        const cells = c.items.map((it, i) => {
          const ic = it.icon ? `<div class="proc-ic">${esc3(it.icon)}</div>` : "";
          const card = `<div class="proc-p">${ic}<div class="proc-t">${esc3(it.title)}</div>${it.desc ? `<div class="proc-d">${esc3(it.desc)}</div>` : ""}</div>`;
          return i < c.items.length - 1 ? `${card}<div class="proc-arr">\u203A</div>` : card;
        }).join("");
        return `<div class="proc">${cells}</div>`;
      }
      case "RatingCard": {
        const filled = Math.round(c.value);
        const on = "\u2605".repeat(Math.max(0, filled));
        const off = "\u2605".repeat(Math.max(0, c.max - filled));
        return `<div class="rating"><span class="rt-on">${on}</span><span class="rt-off">${off}</span><span class="rt-num">${esc3(`${c.value} / ${c.max}`)}</span>${c.label ? `<span class="rt-lb">${esc3(c.label)}</span>` : ""}</div>`;
      }
      case "TagGroup":
        return `<div class="tag-group">${c.items.map((t) => `<span class="tg-tag">${esc3(t)}</span>`).join("")}</div>`;
      case "ChipGroup":
        return `<div class="chip-group">${c.items.map((t) => `<span class="cg-chip">${esc3(t)}</span>`).join("")}</div>`;
      case "TreeCard":
        return `<div class="tree">${c.items.map((it) => `<div class="tree-row" style="padding-left:${it.depth * 18}px"><span class="tree-mk">\u2514</span>${esc3(it.label)}</div>`).join("")}</div>`;
      case "PaginationCard": {
        const dots = Array.from({ length: c.total }, (_, i) => `<span class="pgn-dot${i + 1 === c.current ? " on" : ""}">${i + 1}</span>`).join("");
        return `<div class="pgn"><div class="pgn-dots">${dots}</div><div class="pgn-meta">${c.current} / ${c.total} \uD398\uC774\uC9C0</div></div>`;
      }
      case "EmptyState":
        return `<div class="empty">${c.icon ? `<div class="empty-ic">${esc3(c.icon)}</div>` : ""}<div class="empty-t">${esc3(c.title)}</div>${c.desc ? `<div class="empty-d">${esc3(c.desc)}</div>` : ""}</div>`;
      case "SearchBar": {
        const shown = c.query || c.placeholder;
        const cls = c.query ? "srch-q" : "srch-ph";
        return `<div class="srch"><span class="srch-ic">\u{1F50D}</span><span class="${cls}">${esc3(shown)}</span></div>`;
      }
      case "TooltipBox":
        return `<div class="tip-box">${c.label ? `<div class="tip-lb">${esc3(c.label)}</div>` : ""}<div class="tip-tx">${esc3(c.text)}</div></div>`;
      case "PopoverBox":
        return `<div class="pop-box">${c.title ? `<div class="pop-t">${esc3(c.title)}</div>` : ""}<div class="pop-tx">${esc3(c.text)}</div></div>`;
      case "ModalCard":
        return `<div class="modal-card"><div class="modal-t">${esc3(c.title)}</div><div class="modal-tx">${esc3(c.text)}</div></div>`;
      case "DrawerCard":
        return `<div class="drawer-card"><div class="drawer-t">${esc3(c.title)}</div><div class="drawer-tx">${esc3(c.text)}</div></div>`;
      case "SkeletonCard":
        return `<div class="skel">${Array.from({ length: c.lines }, (_, i) => `<div class="skel-bar"${i === c.lines - 1 ? ' style="width:60%"' : ""}></div>`).join("")}</div>`;
      case "FileCard": {
        const sub = [c.fileType, c.size].filter((s) => s !== "").join(" \xB7 ");
        return `<div class="file-card"><div class="file-ic">\u{1F4C4}</div><div class="file-meta"><div class="file-name">${esc3(c.name)}</div>${sub ? `<div class="file-sub">${esc3(sub)}</div>` : ""}</div></div>`;
      }
      case "ImageBlock":
        return `<div class="slot-frame"><div class="slot-icon"></div><div class="slot-tag">IMAGE SLOT</div><div class="slot-meta">id: ${esc3(
          c.id
        )} \xB7 type: ${esc3(c.imageType)}</div><div class="slot-prompt">${esc3(c.prompt)}</div></div>`;
    }
  }
  function renderTable(columns, rows) {
    const head = `<tr>${columns.map((h) => `<th>${esc3(h)}</th>`).join("")}</tr>`;
    const body = rows.map((r) => `<tr>${r.map((cell) => `<td>${esc3(cell)}</td>`).join("")}</tr>`).join("");
    return `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
  }
  var CARD_COMPONENTS = /* @__PURE__ */ new Set([
    "TableCard",
    "ChecklistCard",
    "CompareCard",
    "BeforeAfterCard",
    "PromptCard",
    "StepsCard",
    "FAQCard",
    "WarningCard",
    "ResultCard",
    "CalloutCard",
    "TimelineCard",
    "FeatureCard",
    "ProgressCard",
    "StepperCard",
    "TimelineCardList",
    "ImageBlock"
  ]);
  function renderLayoutComponent(lc) {
    var _a;
    if (lc.componentType === "ImageBlock") {
      const img = lc.component;
      if (img.src) {
        return `<figure class="fig" data-id="${lc.componentId}" data-type="ImageBlock"><img class="fig-img" src="${img.src}" alt="${esc3((_a = img.prompt) != null ? _a : "")}" />${img.prompt ? `<figcaption class="fig-cap">${esc3(img.prompt)}</figcaption>` : ""}</figure>`;
      }
    }
    const inner = renderComponentInner(lc.component);
    if (CARD_COMPONENTS.has(lc.componentType)) {
      const imageCls = lc.componentType === "ImageBlock" ? " image-slot" : "";
      const variant = lc.component.variant;
      const variantAttr = variant ? ` data-variant="${variant}"` : "";
      return `<div class="card tone-${lc.tone}${imageCls}" data-id="${lc.componentId}" data-type="${lc.componentType}"${variantAttr}>${inner}</div>`;
    }
    return `<div data-id="${lc.componentId}" data-type="${lc.componentType}">${inner}</div>`;
  }
  function renderPage(page, recipe) {
    const body = page.components.map(renderLayoutComponent).join("\n  ");
    const variantCls = recipe.variant && recipe.variant !== "none" ? ` var-${recipe.variant}` : "";
    return `<section class="page" data-page="${page.pageType}">
  <div class="page-body grid-${recipe.gridStyle}${variantCls}">
  ${body}
  </div>
</section>`;
  }
  function renderHtml(pages, tokens, docTitle, recipe = BASE_RECIPE, componentSelectorName, pageScopeName) {
    const css = buildCss(tokens, recipe);
    const pagesHtml = pages.map((p) => renderPage(p, recipe)).join("\n");
    const selAttr = componentSelectorName ? ` data-component-selector="${componentSelectorName}"` : "";
    const scopeAttr = pageScopeName ? ` data-page-scope="${pageScopeName}"` : "";
    return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc3(docTitle)}</title>
<style>
${css}
</style>
</head>
<body${selAttr}${scopeAttr}>
<main class="book">
${pagesHtml}
</main>
</body>
</html>
`;
  }

  // src/design-tokens/default-tokens.ts
  var DEFAULT_TOKENS = {
    colors: {
      navy: "#1F2D5A",
      orange: "#F5821F",
      cyan: "#1FB6C9",
      ink: "#1A1A1A",
      gray: "#9AA0A6",
      paper: "#FFFFFF"
    },
    typography: {
      fontFamily: "system",
      scale: { title: 40, chapter: 28, body: 16, caption: 12, emphasis: 18 },
      lineHeight: { body: 1.7, heading: 1.3 }
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 40, xxl: 64 },
    radius: { card: 12, image: 8 },
    cardTone: {
      warning: "emphasis",
      result: "emphasis",
      prompt: "info",
      steps: "info",
      faq: "info",
      checklist: "neutral",
      table: "neutral",
      compare: "neutral",
      "before-after": "neutral"
    },
    canvas: {
      square: { ratio: "1:1", width: 1080, height: 1080 },
      vertical: { ratio: "9:16", width: 1080, height: 1920 },
      detailBanner: { ratio: "verticalLong", width: 1080, height: 3240 }
    }
  };

  // src/theme-engine/theme-engine.ts
  var DEFAULT_THEME_NAME = "ModernGlass";
  var MODERN_GLASS_RECIPE = {
    pageBackground: "#f6f7f9",
    pageShadow: false,
    // 그림자 대신 얇은 border 로 분리
    pageRadius: 28,
    // radius 큼
    cardShadow: false,
    // 그림자 거의 없음
    cardTint: false,
    // 과한 카드 틴트 제거
    cardBorder: "#ECEEF2",
    // 얇고 연한 border 중심
    accent: false,
    // 색 절제(장식 액센트 최소)
    tableHeaderTinted: false,
    // 엑셀 느낌 표 제거
    checkboxRadius: 6,
    density: "spacious",
    // 큰 여백, 낮은 밀도, 숨쉬는 느낌
    cardStyle: "glass",
    tableStyle: "open",
    badgeStyle: "outline",
    gridStyle: "stack",
    variant: "none"
  };
  var BENTO_RECIPE = {
    pageBackground: "#f1f2f4",
    pageShadow: false,
    pageRadius: 28,
    cardShadow: false,
    cardTint: true,
    // 의미 톤 카드에 존재감(warning/result/info 독립)
    cardBorder: "#E6E8EC",
    accent: true,
    // 숫자 배지/액센트 강조
    tableHeaderTinted: true,
    // OpenAI 정보 카드형 표 헤더
    checkboxRadius: 8,
    density: "comfortable",
    cardStyle: "soft",
    tableStyle: "lined",
    badgeStyle: "solid",
    // 강한 숫자 배지
    gridStyle: "bento",
    // 벤토 그리드
    variant: "none"
  };
  var EDITORIAL_RECIPE = {
    pageBackground: "#efece5",
    // 따뜻한 종이 톤
    pageShadow: true,
    // 인쇄된 지면 느낌(은은한 그림자)
    pageRadius: 6,
    // 낮은 라운드(출판물)
    cardShadow: false,
    cardTint: false,
    cardBorder: "#e3ded5",
    // 따뜻한 hairline
    accent: false,
    // 차분하게
    tableHeaderTinted: false,
    checkboxRadius: 3,
    density: "spacious",
    // 읽기 위한 넓은 여백
    cardStyle: "soft",
    tableStyle: "lined",
    badgeStyle: "outline",
    gridStyle: "stack",
    variant: "editorial"
    // Editorial 전용 CSS 활성
  };
  var DASHBOARD_RECIPE = {
    pageBackground: "#eef1f5",
    // 옅은 운영 화면 배경
    pageShadow: false,
    pageRadius: 12,
    cardShadow: false,
    cardTint: false,
    cardBorder: "#e7eaef",
    accent: true,
    // 상태/배지 표현 활성
    tableHeaderTinted: true,
    checkboxRadius: 6,
    density: "comfortable",
    // 정보 밀도 높게(여백 과하지 않게)
    cardStyle: "soft",
    tableStyle: "lined",
    badgeStyle: "solid",
    gridStyle: "stack",
    variant: "dashboard"
    // Dashboard 전용 CSS 활성
  };
  var COZY_RECIPE = { ...BASE_RECIPE };
  var MINIMAL_RECIPE = {
    pageBackground: "#f5f5f4",
    pageShadow: false,
    pageRadius: 4,
    cardShadow: false,
    cardTint: false,
    cardBorder: "#e5e5e5",
    accent: false,
    tableHeaderTinted: false,
    checkboxRadius: 2,
    density: "comfortable",
    cardStyle: "soft",
    tableStyle: "lined",
    badgeStyle: "outline",
    gridStyle: "stack",
    variant: "none"
  };
  var ModernGlass = {
    name: "ModernGlass",
    label: "Modern Glass",
    // 큰 radius 지향 (base 의 navy/타이포/간격은 상속)
    tokenOverride: {
      radius: { card: 20, image: 16 }
    },
    recipe: MODERN_GLASS_RECIPE
  };
  var Bento = {
    name: "Bento",
    label: "Bento",
    // 큰 라운드 타일 (base 색/타이포/간격은 상속)
    tokenOverride: {
      radius: { card: 22, image: 18 }
    },
    recipe: BENTO_RECIPE
  };
  var Editorial = {
    name: "Editorial",
    label: "Editorial",
    // 출판물 느낌의 낮은 라운드 (base 색/타이포/간격 상속)
    tokenOverride: {
      radius: { card: 8, image: 6 }
    },
    recipe: EDITORIAL_RECIPE
  };
  var Dashboard = {
    name: "Dashboard",
    label: "Dashboard",
    tokenOverride: {
      radius: { card: 12, image: 10 }
    },
    recipe: DASHBOARD_RECIPE
  };
  var CozyBuilderLab = {
    name: "CozyBuilderLab",
    label: "CozyBuilder Lab",
    // base tokens 그대로 사용 (override 없음)
    recipe: COZY_RECIPE
  };
  var Minimal = {
    name: "Minimal",
    label: "Minimal",
    // 색 강조를 낮추고 모서리를 줄임 (base 의 navy 등은 상속)
    tokenOverride: {
      colors: { orange: "#C2703D", cyan: "#5B8A93" },
      radius: { card: 4, image: 4 }
    },
    recipe: MINIMAL_RECIPE
  };
  var THEMES = {
    ModernGlass,
    Bento,
    Editorial,
    Dashboard,
    CozyBuilderLab,
    // v2 레거시(유지)
    Minimal
    // v2 레거시(유지)
  };
  function isPlainObject(v) {
    return typeof v === "object" && v !== null && !Array.isArray(v);
  }
  function deepMerge(base, override) {
    if (!isPlainObject(base) || !isPlainObject(override)) {
      return override === void 0 ? base : override;
    }
    const out = { ...base };
    for (const key of Object.keys(override)) {
      const o = override[key];
      const b = base[key];
      if (isPlainObject(b) && isPlainObject(o)) out[key] = deepMerge(b, o);
      else if (o !== void 0) out[key] = o;
    }
    return out;
  }
  function mergeTokens(base, override) {
    if (!override) return base;
    return deepMerge(base, override);
  }
  function getTheme(name) {
    if (name && THEMES[name]) return THEMES[name];
    return THEMES[DEFAULT_THEME_NAME];
  }
  function resolveTheme(theme) {
    return {
      name: theme.name,
      tokens: mergeTokens(DEFAULT_TOKENS, theme.tokenOverride),
      recipe: theme.recipe
    };
  }
  function resolveThemeByName(name) {
    return resolveTheme(getTheme(name));
  }

  // src/page-builder/profiles.ts
  var FullBookPDF = {
    name: "FullBookPDF",
    format: "pdf",
    selector: { scope: "all" },
    layoutVariant: "fixed"
    // componentSelector 미지정 → 전체 컴포넌트 출력(현재 동작 유지)
  };

  // src/browser/engine-entry.ts
  function embedImages(pages, images) {
    if (!images) return pages;
    for (const p of pages) {
      for (const c of p.components) {
        if (c.type === "ImageBlock" && !c.src && images[c.id]) c.src = images[c.id];
      }
    }
    return pages;
  }
  function withOverride(tokens, ov) {
    if (!ov) return tokens;
    const override = {};
    const typo = {};
    if (ov.fontFamily) typo.fontFamily = ov.fontFamily;
    if (ov.scale) typo.scale = ov.scale;
    if (ov.lineHeight) typo.lineHeight = ov.lineHeight;
    if (Object.keys(typo).length) override.typography = typo;
    if (ov.spacing) override.spacing = ov.spacing;
    return mergeTokens(tokens, override);
  }
  function renderBookHtml(markdown, opts = {}) {
    const book = parseBook(markdown);
    const title = opts.title || book.metadata.title || "\uC81C\uBAA9 \uC5C6\uC74C";
    const theme = resolveThemeByName(opts.themeName || "ModernGlass");
    const tokens = withOverride(theme.tokens, opts.tokenOverride);
    const pages = embedImages(mapComponents(book, buildPages(book, FullBookPDF)), opts.images);
    const layout = applyLayout(pages, tokens);
    return renderHtml(layout, tokens, title, theme.recipe);
  }
  return __toCommonJS(engine_entry_exports);
})();
