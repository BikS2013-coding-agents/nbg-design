// Instrument slide templates — each is a 1920x1080 deck artboard. Same geometry, same names and the same
// props as the NBG templates, re-themed after the "Instrument" design direction: dark but precise rather
// than atmospheric — the register of a good terminal, or of a financial broadsheet at night.
//
// The theme's signature graphic is the HAIRLINE PLOT: thin-stroke polylines, small multiples, monospaced
// figures. The discipline is absolute and it is what keeps the theme one degree away from the stock "AI
// deck": no glows, no gradient washes, no network/node graphics, no brain motifs, one accent per slide.
//
// Photography: eight subjects x three takes in assets/ ("Photography catalogue" in SKILL.md). Every
// template with a picture slot renders the plot panel as its BASE layer and lays the photo over it under
// the night scrim; if a photo is ever missing the layer hides itself (onError) and the plot shows through,
// so a template never breaks. Portrait subjects (rack-aisle, terminal-desk, glass-board) belong in the
// tall panels, landscape ones in the divider band.
//
// Logos: the theme carries no lockup of its own — a deck picks the identity it is presented under. LOCKUP
// below selects it here; in a deck the tokens are {{NBG_LOGO_KNOCKOUT}} / {{AIHUB_LOGO_KNOCKOUT}} (and the
// unprefixed {{LOGO_*}} resolves to the NBG lockup through the theme's asset search path).
//
// Wrap them in <SlideFrame> in the host doc to scale into the layout.

const { useState } = React;

const hidePhoto = (e) => { e.currentTarget.style.display = "none"; };

// ---- the theme's two stacks ------------------------------------------------
// text: IBM Plex Sans (embedded in decks through {{FONT_PLEX_SANS}}, a variable face, weights 100–700)
const SANS = '"IBM Plex Sans", "Segoe UI", Helvetica, Arial, sans-serif';
// every figure, eyebrow and label: IBM Plex Mono ({{FONT_PLEX_MONO_300|400|500}})
const MONO = '"IBM Plex Mono", "SFMono-Regular", Menlo, Consolas, monospace';

// ---- the palette -----------------------------------------------------------
const C = {
  night:  "#0E1726",   // the dark ground
  grid:   "#24334A",   // hairline rules on night
  slate:  "#3C4E6B",   // the secondary plot line
  steel:  "#7D8CA3",   // labels and secondary text on night
  faint:  "#55647C",   // micro-labels on night (sources, units)
  lagoon: "#2F7D6E",   // the primary accent
  amber:  "#E0A32E",   // the second accent / highlight series
  rust:   "#C4441C",   // alert or negative series, sparingly
  ink:    "#1A1A18",   // text on paper
  ink2:   "#4B4943",   // secondary text on paper
  ink3:   "#8A8474",   // mono micro-labels on paper
  rule:   "#D9D6CE",   // hairline rules on paper
  light:  "#E9EEF5",   // text on night
  paper:  "#F2F1EE",   // the light ground
  white:  "#FFFFFF",
};

// which lockup this deck is presented under: "nbg" or "aihub"
const LOCKUP = "nbg";
const LOCKUP_DIR = LOCKUP === "aihub" ? "../AIHub-Design/assets" : "../NBG-Design/assets";
const LOCKUP_ALT = LOCKUP === "aihub" ? "NBG AI Hub" : "NBG";

const LogoMark = ({ variant = "primary", height = 56 }) => {
  const src =
    variant === "knockout" ? `${LOCKUP_DIR}/logo-knockout.png`
    : variant === "small"  ? `${LOCKUP_DIR}/logo-small.png`
    : `${LOCKUP_DIR}/logo-primary.png`;
  return <img src={src} alt={LOCKUP_ALT} onError={hidePhoto} style={{ height, width: "auto", display: "block" }} />;
};

// ---- shared bits -----------------------------------------------------------

// The theme's eyebrow: a zero-padded index, a slash, one uppercase mono word. Never a bracket, never a pill.
const Eyebrow = ({ index, label, color = C.lagoon, size = 20 }) => (
  <div style={{ fontFamily: MONO, fontSize: size, fontWeight: 500, letterSpacing: "0.18em", color }}>
    {index ? `${index} / ` : ""}{label}
  </div>
);

// A hairline rule — the theme's only divider. Never a thick bar, never a gradient.
const Rule = ({ dark = false, width = "100%", color = null }) => (
  <div style={{ width, height: 1, background: color || (dark ? C.grid : C.rule), flexShrink: 0 }} />
);

// A micro-label in mono: source lines, units, periods. Always states where a figure came from.
const Micro = ({ children, dark = false, size = 17 }) => (
  <div style={{ fontFamily: MONO, fontSize: size, letterSpacing: "0.12em", color: dark ? C.faint : C.ink3 }}>
    {children}
  </div>
);

// THE MOTIF — a hairline plot. `series` is an array of { points, color, width }, each `points` a list of
// [x, y] in a 0..100 / 0..100 space (y measured from the top) that is mapped into the plot's ARTBOARD
// pixel box: `w` and `h` are 1920×1080 artboard pixels, and so are the stroke widths, so a plot reads the
// same at full size, in the 0.375 preview and in the PDF export. Never use vector-effect here — a
// screen-space stroke is 2px whether the slide is 1920 or 720 wide, which is why the lines came out
// invisible in pilot renders. No fills, no area gradients, no markers unless one value is called out.
const STROKE = { lead: 4, second: 3, third: 2.5, small: 3.5, grid: 1 };
const Plot = ({ series, w = 800, h = 240, grid = true, gridColor = C.grid, gridRows = 4 }) => {
  const X = (x) => (x / 100) * w;
  const Y = (y) => (y / 100) * h;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
      {grid &&
        Array.from({ length: gridRows + 1 }, (_, i) => (
          <line key={i} x1={0} x2={w} y1={Y((i * 100) / gridRows)} y2={Y((i * 100) / gridRows)}
                stroke={gridColor} strokeWidth={STROKE.grid} />
        ))}
      {series.map((s, i) => (
        <polyline key={i} points={s.points.map((p) => `${X(p[0])},${Y(p[1])}`).join(" ")} fill="none"
                  stroke={s.color} strokeWidth={s.width || STROKE.lead}
                  strokeLinejoin="round" strokeLinecap="round" />
      ))}
    </svg>
  );
};

// A small multiple: one tiny plot under one mono label. Four to six of these read as a measurement, not a
// decoration — the theme's answer to an icon row.
const SmallMultiple = ({ label, points, color = C.lagoon, dark = true, w = 240, h = 84 }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <Plot series={[{ points, color, width: STROKE.small }]} w={w} h={h} grid={false} />
    <div style={{ fontFamily: MONO, fontSize: 17, letterSpacing: "0.14em", color: dark ? C.steel : C.ink3 }}>{label}</div>
  </div>
);

// A data numeral — currency, table values, comparison figures, anything 36px and below. Mono 500,
// tabular, no negative tracking, never below 26px on the artboard: at 1366×768 a 1920-wide slide is
// scaled to 71%, and a Light figure at 26px was found illegible in pilot use. Display numerals (the one
// big figure, 48px and up) are the other kind — mono 300, set directly where they appear.
const Data = ({ children, dark = false, size = 32, color = null }) => (
  <span style={{
    fontFamily: MONO, fontWeight: 500, fontSize: Math.max(26, size), letterSpacing: 0,
    fontVariantNumeric: "tabular-nums", color: color || (dark ? C.light : C.ink),
  }}>{children}</span>
);

const PageFooter = ({ pageNum, dark = false, ftrLabel = "" }) => (
  <div
    style={{
      position: "absolute", left: 90, right: 90, bottom: 44,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      color: dark ? C.faint : C.ink3, fontFamily: MONO, fontSize: 18, letterSpacing: "0.12em",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      {/* the colour lockup disappears on night — the footer knocks out there */}
      <LogoMark variant={dark ? "knockout" : "small"} height={28} />
      <span>{ftrLabel}</span>
    </div>
    <Data dark={dark} size={26} color={dark ? C.steel : C.ink2}>{pageNum}</Data>
  </div>
);

// pick the variant of a copy block based on lang
const T = ({ en, gr, lang }) => {
  if (lang === "gr") return <>{gr}</>;
  if (lang === "bi")
    return (
      <>
        {en}
        <span style={{ display: "block", opacity: 0.55, fontWeight: 400, marginTop: 8 }}>{gr}</span>
      </>
    );
  return <>{en}</>;
};

// The picture slot: the plot panel is the base layer, the photo (when one is bundled) lies over it under a
// night scrim that pulls it into the palette. The scrim belongs to the PHOTO layer, not to the panel — when
// no photo is on disk the whole layer hides itself and the plot shows at full strength.
const hidePhotoLayer = (e) => {
  const layer = e.currentTarget.parentElement;
  if (layer) layer.style.display = "none"; else e.currentTarget.style.display = "none";
};
const PicturePanel = ({ photo = "assets/photo-terminal-desk-2.jpeg", accent = C.lagoon, children }) => (
  <>
    <div style={{ position: "absolute", inset: 0, background: C.night }} />
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {children}
    </div>
    <div style={{ position: "absolute", inset: 0 }}>
      <img src={photo} alt="" onError={hidePhotoLayer}
           style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(0.35) contrast(1.05)" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(14,23,38,0.28) 0%, rgba(14,23,38,0.70) 100%)" }} />
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 5, background: accent }} />
  </>
);

// ============================================================================
// COVERS
// ============================================================================

// COVER 1 — Hero plot right, copy on the night ground at the left.
// Same geometry as the NBG "1_Cover": copy occupies the left ~60%, the picture slot a tall freeform right.
window.Cover1 = function Cover1({ accent = C.lagoon, lang = "en", showLogo = true }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: C.night, color: C.light, fontFamily: SANS, overflow: "hidden" }}>
      {/* right picture slot — the hairline plot today, a photo when one is bundled */}
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 780, overflow: "hidden" }}>
        <PicturePanel accent={accent}>
          <Plot
            w={620} h={520} gridRows={6}
            series={[
              { points: [[0, 88], [12, 84], [24, 79], [36, 68], [48, 63], [60, 48], [72, 44], [84, 27], [100, 14]], color: accent, width: STROKE.lead },
              { points: [[0, 94], [12, 92], [24, 90], [36, 86], [48, 84], [60, 78], [72, 75], [84, 68], [100, 62]], color: C.slate, width: STROKE.second },
            ]}
          />
        </PicturePanel>
      </div>

      {/* the ground dissolving into the panel — a flat hairline edge, never a soft glow */}
      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 1142, background: C.night }} />
      <div style={{ position: "absolute", top: 0, left: 1141, bottom: 0, width: 1, background: C.grid }} />

      <div style={{ position: "absolute", left: 90, top: 90, width: 980, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Eyebrow index="01" label="EVOLUTION" color={accent} />
        <div style={{ fontFamily: MONO, fontSize: 20, letterSpacing: "0.16em", color: C.steel }}>[EVENT NAME] · [DATE]</div>
      </div>

      <div style={{ position: "absolute", left: 90, top: 330, width: 980, display: "flex", flexDirection: "column", gap: 34 }}>
        <h1 style={{ margin: 0, fontSize: 116, fontWeight: 300, lineHeight: 1.04, letterSpacing: "-0.022em", color: C.light }}>
          <T lang={lang}
             en={<>From Automation<br />to <span style={{ fontWeight: 500 }}>Judgement</span></>}
             gr={<>Από την αυτοματοποίηση<br />στην <span style={{ fontWeight: 500 }}>κρίση</span></>} />
        </h1>
        <Rule dark width={980} />
        <p style={{ margin: 0, fontSize: 32, lineHeight: 1.45, color: C.steel, maxWidth: 820 }}>
          <T lang={lang}
             en="Four decades of banking technology — and what actually changes with AI"
             gr="Τέσσερις δεκαετίες τραπεζικής τεχνολογίας — και τι αλλάζει πραγματικά με την τεχνητή νοημοσύνη" />
        </p>
      </div>

      <div style={{ position: "absolute", left: 90, bottom: 110, display: "flex", alignItems: "center", gap: 36 }}>
        <div style={{ fontFamily: MONO, fontSize: 20, letterSpacing: "0.16em", color: C.steel }}>[SPEAKER] · [ROLE]</div>
      </div>

      {showLogo && (
        <div style={{ position: "absolute", left: 90, bottom: 44 }}>
          <LogoMark variant="knockout" height={44} />
        </div>
      )}
    </div>
  );
};

// COVER 2 — The ledger cover: paper ground, the title in ink, one night panel carrying small multiples.
// The paper/night contrast is the theme's signature — use this when the talk opens on evidence.
window.Cover2 = function Cover2({ accent = C.lagoon, lang = "en", showLogo = true }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: C.paper, color: C.ink, fontFamily: SANS, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 90, top: 90, right: 90, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Eyebrow index="01" label="EVOLUTION" color={accent} />
        <div style={{ fontFamily: MONO, fontSize: 20, letterSpacing: "0.16em", color: C.ink3 }}>[EVENT NAME] · [DATE]</div>
      </div>

      <div style={{ position: "absolute", left: 90, top: 300, width: 940, display: "flex", flexDirection: "column", gap: 34 }}>
        <h1 style={{ margin: 0, fontSize: 108, fontWeight: 300, lineHeight: 1.05, letterSpacing: "-0.022em", color: C.ink }}>
          <T lang={lang}
             en={<>Technology was<br />never the <span style={{ fontWeight: 500 }}>constraint</span>.</>}
             gr={<>Η τεχνολογία δεν ήταν<br />ποτέ ο <span style={{ fontWeight: 500 }}>περιορισμός</span>.</>} />
        </h1>
        <Rule width={940} />
        <p style={{ margin: 0, fontSize: 30, lineHeight: 1.45, color: C.ink2, maxWidth: 820 }}>
          <T lang={lang}
             en="What forty years of adoption curves say about the next five"
             gr="Τι λένε σαράντα χρόνια καμπυλών υιοθέτησης για τα επόμενα πέντε" />
        </p>
      </div>

      {/* the night panel: four small multiples, the evidence the talk rests on */}
      <div style={{ position: "absolute", right: 90, top: 260, width: 640, height: 520, background: C.night, padding: 48, boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: "0.16em", color: C.steel }}>ADOPTION BY FUNCTION</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 40 }}>
          <SmallMultiple w={252} label="BACK OFC" points={[[0, 86], [25, 70], [50, 58], [75, 32], [100, 18]]} color={accent} />
          <SmallMultiple w={252} label="RISK"     points={[[0, 90], [25, 82], [50, 66], [75, 56], [100, 38]]} color={accent} />
          <SmallMultiple w={252} label="OPS"      points={[[0, 92], [25, 88], [50, 78], [75, 74], [100, 60]]} color={accent} />
          <SmallMultiple w={252} label="CUSTOMER" points={[[0, 94], [25, 91], [50, 86], [75, 83], [100, 70]]} color={C.amber} />
        </div>
        <Micro dark>INDEXED · [PERIOD] · [SOURCE]</Micro>
      </div>

      <div style={{ position: "absolute", left: 90, bottom: 110, fontFamily: MONO, fontSize: 20, letterSpacing: "0.16em", color: C.ink3 }}>
        [SPEAKER] · [ROLE]
      </div>

      {showLogo && (
        <div style={{ position: "absolute", left: 90, bottom: 44 }}>
          <LogoMark variant="primary" height={44} />
        </div>
      )}
    </div>
  );
};

// COVER 3 — Typographic. No plot, no picture: an index rule, the title, one hairline, the meta row.
// The austere opening — reach for it when the argument, not the evidence, is the hook.
window.Cover3 = function Cover3({ accent = C.amber, lang = "en", showLogo = true }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: C.night, color: C.light, fontFamily: SANS, overflow: "hidden" }}>
      {/* the index rule: the theme's only ornament — a measured scale across the top */}
      <div style={{ position: "absolute", left: 90, right: 90, top: 200, display: "flex", alignItems: "flex-end", height: 30 }}>
        {Array.from({ length: 41 }, (_, i) => (
          <div key={i} style={{ flex: 1, height: i % 10 === 0 ? 22 : 9, borderLeft: `1px solid ${i % 10 === 0 ? accent : C.grid}` }} />
        ))}
      </div>

      <div style={{ position: "absolute", left: 90, top: 100 }}>
        <Eyebrow index="01" label="EVOLUTION" color={accent} />
      </div>

      <div style={{ position: "absolute", left: 90, right: 90, top: 330, display: "flex", flexDirection: "column", gap: 40 }}>
        <h1 style={{ margin: 0, fontSize: 132, fontWeight: 300, lineHeight: 1.02, letterSpacing: "-0.025em", color: C.light, maxWidth: 1560 }}>
          <T lang={lang}
             en={<>The work is changing<br />the <span style={{ fontWeight: 500 }}>organisation</span>.</>}
             gr={<>Το έργο είναι η αλλαγή<br />του <span style={{ fontWeight: 500 }}>οργανισμού</span>.</>} />
        </h1>
        <Rule dark />
        <p style={{ margin: 0, fontSize: 32, lineHeight: 1.45, color: C.steel, maxWidth: 1100 }}>
          <T lang={lang}
             en="Not the model. A field report from four decades of banking technology."
             gr="Όχι του μοντέλου. Μια αναφορά πεδίου από τέσσερις δεκαετίες τραπεζικής τεχνολογίας." />
        </p>
      </div>

      <div style={{ position: "absolute", left: 90, right: 90, bottom: 110, display: "flex", justifyContent: "space-between", alignItems: "baseline", fontFamily: MONO, fontSize: 20, letterSpacing: "0.16em", color: C.steel }}>
        <span>[SPEAKER] · [ROLE]</span>
        <span>[EVENT NAME] · [DATE]</span>
      </div>

      {showLogo && (
        <div style={{ position: "absolute", left: 90, bottom: 44 }}>
          <LogoMark variant="knockout" height={44} />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// DIVIDERS
// ============================================================================

// DIVIDER — picture band. A full-bleed plot band (a photo when one is bundled) with the chapter over it.
window.DividerImage = function DividerImage({ accent = C.lagoon, lang = "en" }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: C.night, color: C.light, fontFamily: SANS, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 560, overflow: "hidden" }}>
        <PicturePanel accent={accent} photo="assets/photo-ops-floor-1.jpeg">
          <Plot
            w={1740} h={400} gridRows={5}
            series={[
              { points: [[0, 78], [10, 74], [20, 76], [30, 62], [40, 65], [50, 48], [60, 52], [70, 33], [80, 36], [90, 20], [100, 12]], color: accent, width: STROKE.lead },
              { points: [[0, 88], [10, 87], [20, 88], [30, 82], [40, 84], [50, 76], [60, 78], [70, 70], [80, 72], [90, 64], [100, 60]], color: C.slate, width: STROKE.second },
            ]}
          />
        </PicturePanel>
      </div>

      <div style={{ position: "absolute", left: 90, top: 660, right: 90, display: "flex", flexDirection: "column", gap: 30 }}>
        <Eyebrow index="02" label="CHAPTER" color={accent} />
        <h2 style={{ margin: 0, fontSize: 92, fontWeight: 300, lineHeight: 1.06, letterSpacing: "-0.022em", color: C.light, maxWidth: 1400 }}>
          <T lang={lang} en="Where adoption actually happens" gr="Πού συμβαίνει στην πραγματικότητα η υιοθέτηση" />
        </h2>
        <Rule dark />
        <Micro dark>[SECTION SUMMARY IN ONE LINE]</Micro>
      </div>
    </div>
  );
};

// DIVIDER — dark. The chapter number as a display numeral: mono 300, very large, negative tracking.
window.DividerDark = function DividerDark({ accent = C.amber, lang = "en" }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: C.night, color: C.light, fontFamily: SANS, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 90, top: 100 }}>
        <Eyebrow index={null} label="CHAPTER" color={accent} />
      </div>

      <div style={{ position: "absolute", left: 90, top: 320, display: "flex", alignItems: "flex-start", gap: 90 }}>
        {/* display numeral: mono 300, 48px and up — the other kind from the Data numerals */}
        <div style={{ fontFamily: MONO, fontWeight: 300, fontSize: 420, lineHeight: 0.82, letterSpacing: "-0.04em", color: accent }}>02</div>
        <div style={{ width: 1000, display: "flex", flexDirection: "column", gap: 34, paddingTop: 40 }}>
          <h2 style={{ margin: 0, fontSize: 96, fontWeight: 300, lineHeight: 1.05, letterSpacing: "-0.022em", color: C.light }}>
            <T lang={lang} en="What the curves say" gr="Τι λένε οι καμπύλες" />
          </h2>
          <Rule dark />
          <p style={{ margin: 0, fontSize: 30, lineHeight: 1.5, color: C.steel }}>
            <T lang={lang}
               en="[One sentence on what this chapter establishes, and on the evidence it rests on.]"
               gr="[Μία πρόταση για το τι τεκμηριώνει αυτό το κεφάλαιο και σε ποια στοιχεία στηρίζεται.]" />
          </p>
        </div>
      </div>

      <div style={{ position: "absolute", left: 90, right: 90, bottom: 110 }}>
        <Rule dark />
      </div>
      <div style={{ position: "absolute", left: 90, bottom: 60 }}>
        <Micro dark>[SOURCE] · [PERIOD]</Micro>
      </div>
    </div>
  );
};

// DIVIDER — bright. The palette cleanse: paper ground, ink title, one accent rule. Use it between two dark
// chapters so the night grounds keep their force.
window.DividerBright = function DividerBright({ accent = C.lagoon, lang = "en" }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: C.paper, color: C.ink, fontFamily: SANS, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 90, top: 100 }}>
        <Eyebrow index="03" label="CHAPTER" color={accent} />
      </div>

      <div style={{ position: "absolute", left: 90, right: 90, top: 330, display: "flex", flexDirection: "column", gap: 40 }}>
        <h2 style={{ margin: 0, fontSize: 104, fontWeight: 300, lineHeight: 1.04, letterSpacing: "-0.022em", color: C.ink, maxWidth: 1500 }}>
          <T lang={lang} en="The part that is not the model" gr="Το μέρος που δεν είναι το μοντέλο" />
        </h2>
        <div style={{ width: 200, height: 3, background: accent }} />
        <p style={{ margin: 0, fontSize: 32, lineHeight: 1.45, color: C.ink2, maxWidth: 1100 }}>
          <T lang={lang}
             en="[One sentence naming the shift this chapter argues for.]"
             gr="[Μία πρόταση που ονομάζει τη μετατόπιση που υποστηρίζει αυτό το κεφάλαιο.]" />
        </p>
      </div>

      <div style={{ position: "absolute", left: 90, right: 90, bottom: 110 }}>
        <Rule />
      </div>
      <div style={{ position: "absolute", left: 90, bottom: 60 }}>
        <Micro>[SOURCE] · [PERIOD]</Micro>
      </div>
    </div>
  );
};

// ============================================================================
// CONTENT — Standard title + body
// ============================================================================

// CONTENT — title and body left, a night plot panel right. The everyday evidence page.
window.ContentImageRight = function ContentImageRight({ accent = C.lagoon, lang = "en" }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: C.paper, color: C.ink, fontFamily: SANS, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 90, top: 90, width: 900, display: "flex", flexDirection: "column", gap: 28 }}>
        <Eyebrow index="02.1" label="ADOPTION" color={accent} size={18} />
        <h3 style={{ margin: 0, fontSize: 68, fontWeight: 300, lineHeight: 1.1, letterSpacing: "-0.02em", color: C.ink }}>
          <T lang={lang} en="Adoption runs back to front" gr="Η υιοθέτηση κινείται από πίσω προς τα εμπρός" />
        </h3>
        <Rule width={900} />
      </div>

      <div style={{ position: "absolute", left: 90, top: 330, width: 860, display: "flex", flexDirection: "column", gap: 40 }}>
        <p style={{ margin: 0, fontSize: 30, lineHeight: 1.55, color: C.ink2 }}>
          <T lang={lang}
             en="[The claim, in one or two sentences. Say what the figure on the right shows before the audience has to work it out.]"
             gr="[Ο ισχυρισμός, σε μία ή δύο προτάσεις. Πείτε τι δείχνει το διάγραμμα δεξιά πριν χρειαστεί να το βρει το κοινό.]" />
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {[
            { k: "BACK OFFICE", v: "[00]%" },
            { k: "RISK & CONTROL", v: "[00]%" },
            { k: "CUSTOMER-FACING", v: "[00]%" },
          ].map((row) => (
            <div key={row.k} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 24, paddingBottom: 16, borderBottom: `1px solid ${C.rule}` }}>
              <span style={{ fontFamily: MONO, fontSize: 20, letterSpacing: "0.14em", color: C.ink3 }}>{row.k}</span>
              <Data size={34}>{row.v}</Data>
            </div>
          ))}
        </div>
        <Micro>SOURCE: [YOUR SOURCE] · [PERIOD]</Micro>
      </div>

      <div style={{ position: "absolute", right: 90, top: 90, width: 780, bottom: 160, overflow: "hidden" }}>
        <PicturePanel accent={accent} photo="assets/photo-glass-board-2.jpeg">
          <Plot
            w={620} h={600} gridRows={6}
            series={[
              { points: [[0, 84], [14, 76], [28, 70], [42, 56], [57, 50], [71, 34], [85, 28], [100, 16]], color: accent, width: STROKE.lead },
              { points: [[0, 90], [14, 86], [28, 84], [42, 76], [57, 72], [71, 62], [85, 58], [100, 48]], color: C.slate, width: STROKE.second },
              { points: [[0, 95], [14, 94], [28, 92], [42, 90], [57, 88], [71, 84], [85, 82], [100, 76]], color: C.steel, width: STROKE.third },
            ]}
          />
        </PicturePanel>
      </div>

      <PageFooter pageNum="12" ftrLabel="[DECK TITLE]" />
    </div>
  );
};

// CONTENT — two columns of argument, hairline separated, each headed by a mono kicker.
window.ContentTwoColumn = function ContentTwoColumn({ accent = C.lagoon, lang = "en" }) {
  const cols = [
    {
      k: "01 / WHAT CHANGED",
      en_h: "The cost of a judgement fell",
      gr_h: "Το κόστος μιας κρίσης έπεσε",
      en_b: "[Two or three sentences. Keep each column to one idea — the theme's authority comes from restraint, not from density.]",
      gr_b: "[Δύο ή τρεις προτάσεις. Κρατήστε κάθε στήλη σε μία ιδέα — η αυθεντία του θέματος προκύπτει από τη λιτότητα, όχι από την πυκνότητα.]",
    },
    {
      k: "02 / WHAT DID NOT",
      en_h: "The cost of being wrong",
      gr_h: "Το κόστος του λάθους",
      en_b: "[Two or three sentences. If a figure belongs here, set it as a data numeral and state its source underneath.]",
      gr_b: "[Δύο ή τρεις προτάσεις. Αν ανήκει εδώ κάποιο μέγεθος, δώστε το ως αριθμητικό δεδομένο και αναφέρετε την πηγή από κάτω.]",
    },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, background: C.paper, color: C.ink, fontFamily: SANS, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 90, top: 90, right: 90, display: "flex", flexDirection: "column", gap: 28 }}>
        <Eyebrow index="02.2" label="MECHANISM" color={accent} size={18} />
        <h3 style={{ margin: 0, fontSize: 68, fontWeight: 300, lineHeight: 1.1, letterSpacing: "-0.02em", color: C.ink, maxWidth: 1400 }}>
          <T lang={lang} en="Two costs moved in opposite directions" gr="Δύο κόστη κινήθηκαν σε αντίθετες κατευθύνσεις" />
        </h3>
        <Rule />
      </div>

      <div style={{ position: "absolute", left: 90, right: 90, top: 340, display: "grid", gridTemplateColumns: "1fr 1px 1fr", gap: 80 }}>
        {[0, 1].map((i) => (
          <React.Fragment key={i}>
            {i === 1 && <div style={{ background: C.rule }} />}
            <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
              <div style={{ fontFamily: MONO, fontSize: 20, letterSpacing: "0.18em", color: i === 0 ? accent : C.ink3 }}>{cols[i].k}</div>
              <h4 style={{ margin: 0, fontSize: 44, fontWeight: 300, lineHeight: 1.15, letterSpacing: "-0.018em", color: C.ink }}>
                <T lang={lang} en={cols[i].en_h} gr={cols[i].gr_h} />
              </h4>
              <p style={{ margin: 0, fontSize: 28, lineHeight: 1.55, color: C.ink2 }}>
                <T lang={lang} en={cols[i].en_b} gr={cols[i].gr_b} />
              </p>
              <Plot
                w={780} h={170}
                gridRows={3}
                gridColor={C.rule}
                series={[{ points: i === 0
                  ? [[0, 18], [25, 34], [50, 52], [75, 70], [100, 86]]
                  : [[0, 62], [25, 58], [50, 60], [75, 55], [100, 57]], color: i === 0 ? accent : C.ink3, width: STROKE.lead }]}
              />
              <Micro>SOURCE: [YOUR SOURCE]</Micro>
            </div>
          </React.Fragment>
        ))}
      </div>

      <PageFooter pageNum="18" ftrLabel="[DECK TITLE]" />
    </div>
  );
};

// CONTENT — the one figure. The theme's signature page: a display numeral on the night ground, the small
// multiples that earn it underneath, and the source line that makes it checkable.
window.ContentStat = function ContentStat({ accent = C.amber, lang = "en" }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: C.night, color: C.light, fontFamily: SANS, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 90, top: 90, right: 90, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Eyebrow index="03.1" label="THE FIGURE" color={accent} size={18} />
        <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: "0.16em", color: C.steel }}>[PERIOD]</div>
      </div>

      <div style={{ position: "absolute", left: 90, top: 250, width: 1180, display: "flex", flexDirection: "column", gap: 40 }}>
        {/* display numeral: mono 300, negative tracking, nothing else on the line */}
        <div style={{ fontFamily: MONO, fontWeight: 300, fontSize: 300, lineHeight: 0.86, letterSpacing: "-0.04em", color: accent }}>[00]%</div>
        <Rule dark width={1180} />
        <p style={{ margin: 0, fontSize: 46, fontWeight: 300, lineHeight: 1.3, letterSpacing: "-0.012em", color: C.light, maxWidth: 1080 }}>
          <T lang={lang}
             en="of the work is changing the organisation, not the model"
             gr="του έργου είναι η αλλαγή του οργανισμού, όχι του μοντέλου" />
        </p>
      </div>

      {/* the evidence: four small multiples, one per function */}
      <div style={{ position: "absolute", right: 90, top: 250, width: 480, display: "flex", flexDirection: "column", gap: 34 }}>
        <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: "0.16em", color: C.steel }}>BY FUNCTION</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 36 }}>
          <SmallMultiple w={222} label="BACK OFC" points={[[0, 86], [25, 70], [50, 58], [75, 32], [100, 18]]} color={accent} />
          <SmallMultiple w={222} label="RISK"     points={[[0, 90], [25, 82], [50, 66], [75, 56], [100, 38]]} color={accent} />
          <SmallMultiple w={222} label="OPS"      points={[[0, 92], [25, 88], [50, 78], [75, 74], [100, 60]]} color={accent} />
          <SmallMultiple w={222} label="CUSTOMER" points={[[0, 94], [25, 91], [50, 86], [75, 83], [100, 70]]} color={C.rust} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {[
            { k: "SAMPLE", v: "[000]" },
            { k: "PERIOD", v: "[YYYY–YYYY]" },
          ].map((row) => (
            <div key={row.k} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 20, paddingBottom: 14, borderBottom: `1px solid ${C.grid}` }}>
              <span style={{ fontFamily: MONO, fontSize: 18, letterSpacing: "0.14em", color: C.steel }}>{row.k}</span>
              <Data dark size={28}>{row.v}</Data>
            </div>
          ))}
        </div>
        <Micro dark>SOURCE: [YOUR SOURCE]</Micro>
      </div>

      <PageFooter pageNum="24" dark ftrLabel="[DECK TITLE]" />
    </div>
  );
};
