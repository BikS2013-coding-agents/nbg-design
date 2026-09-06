/* NBG Design — print-layout shim shared by export-pdf.mjs (evaluated in headless Chrome)
 * and by the in-deck right-click menu (add-deck-menu.mjs / lib/deck-menu.js). Plain browser
 * JavaScript, no module syntax: export-pdf.mjs reads this file as text and evaluates it in the
 * page, and add-deck-menu.mjs inlines it into the deck. Keep it dependency-free and ES2017-compatible.
 *
 * nbgPreparePrintLayout(opts) turns the interactive deck into a print layout WITHOUT
 * touching any slide's own design:
 *   - every top-level slide becomes visible in normal flow (navigation toggles lifted);
 *   - the viewport-fit host layer (scaled wrappers, fixed stages, flex centering) is
 *     neutralised; non-slide chrome (buttons, counters, menus) is hidden;
 *   - animations/transitions jump to their end state; backgrounds are forced to print;
 *   - the page box is the slide's own box (normally 1920x1080 px = 20 x 11.25 in), one
 *     slide per page, zero margins.
 * It returns a diagnostic object { slides, page, forcedDisplay, hiddenElements, ancestors,
 * sizeMismatch, notes } and records every mutation so nbgRestorePrintLayout() can put the
 * deck back exactly as it was (used by the in-deck menu after the print dialog closes).
 */

var __nbgPrintRegistry = null;

async function nbgPreparePrintLayout(opts) {
  opts = opts || {};
  var diag = { slides: 0, page: null, forcedDisplay: 0, hiddenElements: 0, ancestors: 0, sizeMismatch: [], notes: [] };
  if (__nbgPrintRegistry) { diag.notes.push('already prepared'); diag.slides = __nbgPrintRegistry.slides; diag.page = __nbgPrintRegistry.page; return diag; }
  var sel = opts.selector || '.slide';
  var all = Array.prototype.slice.call(document.querySelectorAll(sel));
  var slides = all.filter(function (s) { return !(s.parentElement && s.parentElement.closest(sel)); });
  if (!slides.length) { diag.notes.push('no element matches "' + sel + '"'); return diag; }
  diag.slides = slides.length;

  var reg = { slides: slides.length, page: null, style: null, touched: [] };
  function remember(el) {
    reg.touched.push({ el: el, className: el.getAttribute('class'), style: el.getAttribute('style'),
      hidden: el.getAttribute('hidden'), ariaHidden: el.getAttribute('aria-hidden') });
  }

  // 1. Global print rules (page box is filled in after measurement).
  var style = document.createElement('style');
  style.id = 'nbg-pdf-style';
  document.head.appendChild(style);
  reg.style = style;
  var baseCss = '\n' +
    'html, body { margin:0 !important; padding:0 !important; height:auto !important; min-height:0 !important;' +
    ' max-height:none !important; overflow:visible !important; background:transparent !important; }\n' +
    '*, *::before, *::after { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important;' +
    ' animation-duration:0s !important; animation-delay:0s !important; animation-fill-mode:forwards !important;' +
    ' transition-duration:0s !important; transition-delay:0s !important; }\n' +
    '::-webkit-scrollbar { display:none !important; }\n' +
    '.nbg-pdf-ancestor { position:static !important; display:block !important; transform:none !important;' +
    ' width:auto !important; height:auto !important; min-width:0 !important; min-height:0 !important;' +
    ' max-width:none !important; max-height:none !important; margin:0 !important; padding:0 !important;' +
    ' inset:auto !important; overflow:visible !important; aspect-ratio:auto !important; zoom:1 !important;' +
    ' flex:none !important; float:none !important; border:0 !important; }\n' +
    '.nbg-pdf-hidden { display:none !important; }\n' +
    '.nbg-pdf-slide { position:relative !important; inset:auto !important; margin:0 !important; transform:none !important;' +
    ' opacity:1 !important; visibility:visible !important; overflow:hidden !important; float:none !important;' +
    ' zoom:1 !important; break-after:page !important; page-break-after:always !important;' +
    ' break-inside:avoid !important; page-break-inside:avoid !important; }\n' +
    '.nbg-pdf-last { break-after:auto !important; page-break-after:auto !important; }\n';
  style.textContent = baseCss;

  // 2. Neutralise every ancestor of a slide and hide the siblings that are not on the way
  //    to a slide (navigation buttons, counters, hints, decorative stage backgrounds).
  var chain = [];
  slides.forEach(function (s) {
    var p = s.parentElement;
    while (p && p !== document.documentElement) { if (chain.indexOf(p) < 0) chain.push(p); p = p.parentElement; }
  });
  var skipTags = { SCRIPT: 1, STYLE: 1, LINK: 1, TEMPLATE: 1, META: 1, TITLE: 1, NOSCRIPT: 1 };
  chain.forEach(function (a) {
    remember(a);
    a.classList.add('nbg-pdf-ancestor');
    diag.ancestors++;
    Array.prototype.slice.call(a.children).forEach(function (c) {
      if (chain.indexOf(c) >= 0 || slides.indexOf(c) >= 0 || skipTags[c.tagName]) return;
      remember(c);
      c.classList.add('nbg-pdf-hidden');
      diag.hiddenElements++;
    });
  });

  // 3. Make every slide visible in flow. Lift the navigation toggles, keep the design CSS.
  slides.forEach(function (s, i) {
    remember(s);
    s.classList.remove('hidden', 'is-hidden', 'inactive');
    s.classList.add('active', 'nbg-pdf-slide');
    s.removeAttribute('hidden');
    s.removeAttribute('aria-hidden');
    ['display', 'opacity', 'visibility', 'transform', 'position', 'top', 'left', 'right', 'bottom', 'margin']
      .forEach(function (p) { s.style.removeProperty(p); });
    if (i === slides.length - 1) s.classList.add('nbg-pdf-last');
  });
  slides.forEach(function (s) {
    if (getComputedStyle(s).display === 'none') {
      s.style.setProperty('display', 'block', 'important');
      diag.forcedDisplay++;
    }
  });

  // 4. Page box = the slide's own box (or the forced size). Slides of another size are
  //    reported, never resized — resizing would change the design.
  var W, H;
  if (opts.size) { W = opts.size[0]; H = opts.size[1]; }
  else {
    var r0 = slides[0].getBoundingClientRect();
    W = Math.round(r0.width); H = Math.round(r0.height);
  }
  __nbgPrintRegistry = reg;   // registered before the early return so a restore still works
  if (!W || !H) { diag.notes.push('slide 1 has a zero-sized box'); return diag; }
  diag.page = { width: W, height: H };
  reg.page = diag.page;
  slides.forEach(function (s, i) {
    var r = s.getBoundingClientRect();
    var w = Math.round(r.width), h = Math.round(r.height);
    if (w !== W || h !== H) diag.sizeMismatch.push({ slide: i + 1, width: w, height: h });
  });
  style.textContent = '@page { size: ' + W + 'px ' + H + 'px; margin: 0; }\n html, body { width:' + W + 'px !important; }' + baseCss;

  // 5. Wait for fonts, images and two frames so lazy layout settles before printing.
  //    (Everything above ran synchronously, so a `beforeprint` handler already has the layout.)
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) { diag.notes.push('fonts.ready failed: ' + e); }
  await Promise.all(Array.prototype.slice.call(document.images).filter(function (im) { return !im.complete; })
    .map(function (im) { return new Promise(function (res) { im.onload = im.onerror = res; }); }));
  await new Promise(function (res) { requestAnimationFrame(function () { requestAnimationFrame(res); }); });
  window.scrollTo(0, 0);
  return diag;
}

function nbgRestorePrintLayout() {
  var reg = __nbgPrintRegistry;
  if (!reg) return false;
  __nbgPrintRegistry = null;
  if (reg.style && reg.style.parentNode) reg.style.parentNode.removeChild(reg.style);
  // restore in reverse order so an element touched twice ends up with its original state
  for (var i = reg.touched.length - 1; i >= 0; i--) {
    var t = reg.touched[i], el = t.el;
    if (t.className === null) el.removeAttribute('class'); else el.setAttribute('class', t.className);
    if (t.style === null) el.removeAttribute('style'); else el.setAttribute('style', t.style);
    if (t.hidden === null) el.removeAttribute('hidden'); else el.setAttribute('hidden', t.hidden);
    if (t.ariaHidden === null) el.removeAttribute('aria-hidden'); else el.setAttribute('aria-hidden', t.ariaHidden);
  }
  // let the deck's own viewport-fit code recompute its scale/centering
  try { window.dispatchEvent(new Event('resize')); } catch (e) { /* ignore */ }
  return true;
}
