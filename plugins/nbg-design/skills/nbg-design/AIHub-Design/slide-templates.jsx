// AIHub slide templates — each is a 1920x1080 deck artboard. Same geometry as the NBG templates,
// re-themed after the NBG Technology Hub developer portal (developer.nbg.gr): navy-to-lagoon grounds,
// Oswald condensed uppercase titles and numerals, sun-yellow bracketed eyebrows, a circuit-line motif,
// the NBG AI Hub lockups. Photos bleed into the ground (feather + bottom scrim), never a hard card. Photos: the NBG technology set, shared (../NBG-Design/assets/ here;
// {{PHOTO_*}} tokens resolve through the theme's search path in a deck). A missing photo hides itself.
// Wrap them in <SlideFrame> in the host doc to scale into the layout.

const { useState } = React;

const hidePhoto = (e) => { e.currentTarget.style.display = "none"; };
// titles and numerals: Oswald (embedded in decks through the {{FONT_OSWALD}} token), condensed fallbacks
const HEAD = '"Oswald", "Avenir Next Condensed", "Arial Narrow", "Helvetica Neue", Arial, sans-serif';

// ---- shared bits ----------------------------------------------------------

const LogoMark = ({ variant = "primary", height = 56 }) => {
  const src =
    variant === "knockout"
      ? "assets/logo-knockout.png"
      : variant === "small"
      ? "assets/logo-small.png"
      : "assets/logo-primary.png";
  return <img src={src} alt="NBG AI Hub" style={{ height, width: "auto", display: "block" }} />;
};

const PageFooter = ({ pageNum, dark = false, ftrLabel = "" }) => (
  <div
    style={{
      position: "absolute",
      left: 54,
      right: 54,
      bottom: 36,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      color: dark ? "rgba(255,255,255,0.7)" : "rgba(1,42,48,0.55)",
      fontSize: 18,
      letterSpacing: 0.4,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <LogoMark variant={dark ? "small" : "small"} height={28} />
      <span style={{ opacity: 0.7 }}>{ftrLabel}</span>
    </div>
    <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{pageNum}</span>
  </div>
);

// pick the variant of a copy block based on lang
const T = ({ en, gr, lang }) => {
  if (lang === "gr") return <>{gr}</>;
  if (lang === "bi")
    return (
      <>
        {en}
        <span style={{ display: "block", opacity: 0.55, fontWeight: 400, marginTop: 6 }}>
          {gr}
        </span>
      </>
    );
  return <>{en}</>;
};

// ============================================================================
// COVERS
// ============================================================================

// COVER 1 — Hero image right, soft fade to deep teal on left where copy lives.
// Faithful to the original "1_Cover" geometry: copy occupies left ~60%,
// image (or color block) occupies a tall freeform on the right.
window.Cover1 = function Cover1({ accent = "#012A30", lang = "en", showLogo = true }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(160deg, #012A30 0%, #024A6C 100%)",
        color: "white",
        overflow: "hidden",
      }}
    >
      {/* right photo — full height, bleeding off the right edge; the feather below dissolves its left edge into the ground */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: 1000,
          overflow: "hidden",
          background: `linear-gradient(135deg, ${accent} 0%, #01202A 100%)`,
        }}
      >
        <img
          src="../NBG-Design/assets/photo-athens-dusk-1.jpeg"
          alt=""
          onError={hidePhoto}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.92,
            mixBlendMode: "normal",
          }}
        />
      </div>

      {/* feather: the ground colour dissolving into the photo (60% solid, then transparent) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          width: 1300,
          background: "linear-gradient(90deg, #012A30 0%, #012A30 60%, rgba(1,42,48,0) 100%)",
        }}
      />
      {/* bottom scrim: keeps the lockup and meta legible where the photo runs under them */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 220,
          background: "linear-gradient(to top, rgba(1,42,48,0.95), rgba(1,42,48,0))",
        }}
      />

      {/* left copy block */}
      <div style={{ position: "absolute", top: 220, left: 90, maxWidth: 900 }}>
        <div
          style={{
            fontSize: 88,
            lineHeight: 0.95,
            fontWeight: 500,
            fontFamily: HEAD,
            textTransform: "uppercase",
            letterSpacing: -1.5,
            color: "#F3F6F8",
            textWrap: "balance",
          }}
        >
          <T
            en={
              <>
                Connect
                <br />
                <span style={{ color: "#FFF77D" }}>on a global scale.</span>
              </>
            }
            gr={
              <>
                Συνδεθείτε
                <br />
                <span style={{ color: "#FFF77D" }}>σε παγκόσμια κλίμακα.</span>
              </>
            }
            lang={lang}
          />
        </div>

        <div
          style={{
            marginTop: 64,
            fontSize: 28,
            fontWeight: 400,
            opacity: 0.86,
            lineHeight: 1.25,
          }}
        >
          <T
            en="Powerful technology that goes beyond banking — the NBG AI Hub in one deck."
            gr="Ισχυρή τεχνολογία πέρα από την τραπεζική — το NBG AI Hub σε μία παρουσίαση."
            lang={lang}
          />
        </div>

        <div
          style={{
            marginTop: 90,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            fontSize: 16,
            letterSpacing: 0.4,
            opacity: 0.78,
          }}
        >
          <div>Developer meetup · Athens</div>
          <div>DD / MM / YYYY</div>
        </div>
      </div>

      {/* logo */}
      {showLogo && (
        <div style={{ position: "absolute", left: 90, bottom: 80 }}>
          <LogoMark variant="knockout" height={56} />
        </div>
      )}
    </div>
  );
};

// COVER 2 — Big colored panel right with photo masked into a rounded shape;
// type sits on neutral cream background left.
window.Cover2 = function Cover2({ accent = "#1C869D", lang = "en", showLogo = true }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#F3F6F8",
        color: "#012A30",
        overflow: "hidden",
      }}
    >
      {/* hero photo card */}
      <div
        style={{
          position: "absolute",
          top: 60,
          right: 60,
          width: 820,
          height: 960,
          borderRadius: 24,
          background: accent,
          overflow: "hidden",
          boxShadow: "0 30px 80px -30px rgba(1,42,48,0.4)",
        }}
      >
        <img
          src="../NBG-Design/assets/photo-security-2.jpeg"
          alt=""
          onError={hidePhoto}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      {/* accent rule */}
      <div
        style={{
          position: "absolute",
          top: 220,
          left: 90,
          width: 80,
          height: 6,
          background: accent,
          borderRadius: 3,
        }}
      />

      {/* eyebrow */}
      <div
        style={{
          position: "absolute",
          top: 250,
          left: 90,
          fontSize: 16,
          letterSpacing: 3,
          textTransform: "uppercase",
          color: accent,
          fontWeight: 600,
        }}
      >
        [ <T en="Getting started" gr="Ξεκινώντας" lang={lang} /> ]
      </div>

      {/* title */}
      <div
        style={{
          position: "absolute",
          top: 300,
          left: 90,
          width: 880,
          fontSize: 96,
          fontWeight: 500,
            fontFamily: HEAD,
            textTransform: "uppercase",
          lineHeight: 0.96,
          letterSpacing: -2,
          color: "#012A30",
          textWrap: "balance",
        }}
      >
        <T
          en={
            <>
              Build with <span style={{ color: accent }}>NBG</span> APIs.
            </>
          }
          gr={
            <>
              Χτίστε με τα <span style={{ color: accent }}>APIs</span> της NBG.
            </>
          }
          lang={lang}
        />
      </div>

      {/* subtitle */}
      <div
        style={{
          position: "absolute",
          top: 640,
          left: 90,
          width: 880,
          fontSize: 26,
          lineHeight: 1.35,
          color: "rgba(1,42,48,0.78)",
        }}
      >
        <T
          en="A subtitle providing further context about the document, the audience and the purpose of the report."
          gr="Ένας υπότιτλος που παρέχει περισσότερο πλαίσιο σχετικά με το έγγραφο, το κοινό και τον σκοπό της αναφοράς."
          lang={lang}
        />
      </div>

      {/* meta */}
      <div
        style={{
          position: "absolute",
          left: 90,
          bottom: 80,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          width: 880,
        }}
      >
        {showLogo ? <LogoMark variant="primary" height={56} /> : <span />}
        <div
          style={{
            fontSize: 16,
            letterSpacing: 0.4,
            color: "rgba(1,42,48,0.7)",
            textAlign: "right",
            lineHeight: 1.5,
          }}
        >
          <div>Athens, Greece</div>
          <div>14 / 03 / 2026</div>
        </div>
      </div>
    </div>
  );
};

// COVER 3 — Type-led, no photo. Big quote-style title centered on accent block.
window.Cover3 = function Cover3({ accent = "#33B3BF", lang = "en", showLogo = true }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#012A30",
        color: "white",
        overflow: "hidden",
      }}
    >
      {/* subtle horizontal lines pattern */}
      <svg
        width="100%"
        height="100%"
        style={{ position: "absolute", inset: 0, opacity: 0.14 }}
        aria-hidden
      >
        <defs>
          <pattern id="circuit" width="160" height="160" patternUnits="userSpaceOnUse">
            <path d="M0 80 H60 V30 H160 M80 160 V110 H130 V80" fill="none" stroke="#FFF77D" strokeWidth="1" />
            <circle cx="60" cy="80" r="3" fill="#FFF77D" /><circle cx="130" cy="80" r="3" fill="#FFF77D" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#circuit)" />
      </svg>

      {/* accent corner block */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 380,
          height: 380,
          background: accent,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 320,
          right: 60,
          fontSize: 200,
          fontWeight: 300,
            fontFamily: HEAD,
          lineHeight: 1,
          color: accent,
          opacity: 0.18,
        }}
      >
        01
      </div>

      {/* eyebrow */}
      <div
        style={{
          position: "absolute",
          top: 140,
          left: 90,
          fontSize: 16,
          letterSpacing: 3,
          textTransform: "uppercase",
          color: accent,
          fontWeight: 600,
        }}
      >
        [ <T en="AI Hub — 2026" gr="AI Hub — 2026" lang={lang} /> ]
      </div>

      {/* big type */}
      <div
        style={{
          position: "absolute",
          top: 260,
          left: 90,
          right: 480,
          fontSize: 120,
          lineHeight: 0.96,
          fontWeight: 500,
            fontFamily: HEAD,
            textTransform: "uppercase",
          letterSpacing: -2,
          color: "#F3F6F8",
          textWrap: "balance",
        }}
      >
        <T
          en={
            <>
              Ideas
              <br />
              <span style={{ color: accent }}>
                that ship as APIs.
              </span>
            </>
          }
          gr={
            <>
              Ιδέες
              <br />
              <span style={{ color: accent }}>
                που γίνονται APIs.
              </span>
            </>
          }
          lang={lang}
        />
      </div>

      {/* meta */}
      <div
        style={{
          position: "absolute",
          left: 90,
          bottom: 80,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          right: 90,
        }}
      >
        {showLogo ? <LogoMark variant="knockout" height={56} /> : <span />}
        <div
          style={{
            fontSize: 16,
            letterSpacing: 0.4,
            color: "rgba(243,246,248,0.7)",
            textAlign: "right",
            lineHeight: 1.5,
          }}
        >
          <div>NBG AI Hub</div>
          <div>Athens · 14 March 2026</div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// DIVIDERS
// ============================================================================

// DIVIDER A — Dark teal, type-led with big number on left, image card on right.
window.DividerImage = function DividerImage({ accent = "#FFF77D", lang = "en" }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#012A30",
        color: "white",
        overflow: "hidden",
      }}
    >
      {/* photo right — full height, bleeding off the edge, feathered into the ground below */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: 1280,
          overflow: "hidden",
          background: "#01202A",
        }}
      >
        <img
          src="../NBG-Design/assets/photo-network-1.jpeg"
          alt=""
          onError={hidePhoto}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      {/* feather + bottom scrim */}
      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 1150, background: "linear-gradient(90deg, #012A30 0%, #012A30 60%, rgba(1,42,48,0) 100%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 190, background: "linear-gradient(to top, rgba(1,42,48,0.95), rgba(1,42,48,0))" }} />

      {/* huge number */}
      <div
        style={{
          position: "absolute",
          top: 360,
          left: 80,
          fontSize: 220,
          fontWeight: 300,
            fontFamily: HEAD,
          lineHeight: 1,
          letterSpacing: -8,
          color: accent,
        }}
      >
        02
      </div>

      {/* divider label */}
      <div
        style={{
          position: "absolute",
          top: 600,
          left: 90,
          width: 580,
          fontSize: 64,
          fontWeight: 500,
            fontFamily: HEAD,
            textTransform: "uppercase",
          lineHeight: 1,
          letterSpacing: -1,
          color: "#F3F6F8",
        }}
      >
        <T en="Open banking" gr="Open banking" lang={lang} />
      </div>

      <div
        style={{
          position: "absolute",
          top: 700,
          left: 90,
          width: 580,
          fontSize: 22,
          lineHeight: 1.4,
          color: "rgba(243,246,248,0.7)",
        }}
      >
        <T
          en="Account information, payment initiation and confirmation of funds — the APIs that opened the bank."
          gr="Πληροφορίες λογαριασμού, εκκίνηση πληρωμών και επιβεβαίωση διαθεσίμων — τα APIs που άνοιξαν την τράπεζα."
          lang={lang}
        />
      </div>

      <PageFooter pageNum="14" dark ftrLabel={lang === "gr" ? "Ενότητα 02" : "Section 02"} />
    </div>
  );
};

// DIVIDER B — Dark teal, type-only. Quietest section opener.
window.DividerDark = function DividerDark({ accent = "#FFF77D", lang = "en" }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#012A30",
        color: "white",
        overflow: "hidden",
      }}
    >
      {/* accent vertical bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 12,
          background: accent,
        }}
      />

      {/* huge number */}
      <div
        style={{
          position: "absolute",
          top: 380,
          left: 90,
          fontSize: 260,
          fontWeight: 300,
            fontFamily: HEAD,
          lineHeight: 1,
          letterSpacing: -10,
          color: accent,
          opacity: 0.95,
        }}
      >
        03
      </div>

      {/* label */}
      <div
        style={{
          position: "absolute",
          top: 410,
          left: 580,
          right: 90,
          fontSize: 84,
          fontWeight: 500,
            fontFamily: HEAD,
            textTransform: "uppercase",
          lineHeight: 1,
          letterSpacing: -2,
          color: "#F3F6F8",
          textWrap: "balance",
        }}
      >
        <T en="Platform & tooling" gr="Πλατφόρμα & εργαλεία" lang={lang} />
      </div>

      <div
        style={{
          position: "absolute",
          top: 580,
          left: 580,
          right: 90,
          fontSize: 26,
          lineHeight: 1.4,
          color: "rgba(243,246,248,0.7)",
          maxWidth: 720,
        }}
      >
        <T
          en="Sandbox, API keys, the try-out console and the forums — everything a developer touches before going live."
          gr="Sandbox, κλειδιά API, η κονσόλα δοκιμών και τα forums — ό,τι αγγίζει ένας developer πριν βγει σε παραγωγή."
          lang={lang}
        />
      </div>

      <PageFooter pageNum="38" dark ftrLabel={lang === "gr" ? "Ενότητα 03" : "Section 03"} />
    </div>
  );
};

// DIVIDER C — Brights — light cream with bright cyan typographic moment.
window.DividerBright = function DividerBright({ accent = "#33B3BF", lang = "en" }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#F3F6F8",
        color: "#012A30",
        overflow: "hidden",
      }}
    >
      {/* color field bottom-right */}
      <div
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: 720,
          height: 720,
          background: accent,
          borderTopLeftRadius: 24,
        }}
      />

      {/* small section eyebrow */}
      <div
        style={{
          position: "absolute",
          top: 140,
          left: 90,
          fontSize: 16,
          letterSpacing: 3,
          textTransform: "uppercase",
          color: accent,
          fontWeight: 700,
        }}
      >
        [ <T en="Section 04" gr="Ενότητα 04" lang={lang} /> ]
      </div>

      {/* number + label */}
      <div
        style={{
          position: "absolute",
          top: 220,
          left: 90,
          fontSize: 320,
          fontWeight: 300,
            fontFamily: HEAD,
          lineHeight: 0.9,
          letterSpacing: -12,
          color: "#012A30",
        }}
      >
        04
      </div>

      <div
        style={{
          position: "absolute",
          top: 620,
          left: 90,
          fontSize: 72,
          fontWeight: 500,
            fontFamily: HEAD,
            textTransform: "uppercase",
          letterSpacing: -1.5,
          color: "#012A30",
          textWrap: "balance",
          maxWidth: 1000,
          lineHeight: 1,
        }}
      >
        <T en="Developers & community" gr="Developers & κοινότητα" lang={lang} />
      </div>

      <div
        style={{
          position: "absolute",
          top: 730,
          left: 90,
          fontSize: 24,
          lineHeight: 1.4,
          color: "rgba(1,42,48,0.7)",
          maxWidth: 800,
        }}
      >
        <T
          en="Registered developers, published apps, forum answers and the blog — the people around the platform."
          gr="Εγγεγραμμένοι developers, δημοσιευμένες εφαρμογές, απαντήσεις στα forums και το blog — οι άνθρωποι γύρω από την πλατφόρμα."
          lang={lang}
        />
      </div>

      <PageFooter pageNum="62" ftrLabel={lang === "gr" ? "Ενότητα 04" : "Section 04"} />
    </div>
  );
};

// ============================================================================
// CONTENT — Standard title + body
// ============================================================================

// CONTENT A — Image right, body left (Page 1/2 _Image Right pattern)
window.ContentImageRight = function ContentImageRight({ accent = "#012A30", lang = "en" }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "white",
        color: "#0B1F26",
        overflow: "hidden",
      }}
    >
      {/* eyebrow */}
      <div
        style={{
          position: "absolute",
          top: 70,
          left: 90,
          fontSize: 16,
          letterSpacing: 2.5,
          textTransform: "uppercase",
          color: accent,
          fontWeight: 700,
        }}
      >
        [ <T en="02 · API products" gr="02 · Προϊόντα API" lang={lang} /> ]
      </div>

      {/* title */}
      <div
        style={{
          position: "absolute",
          top: 110,
          left: 90,
          width: 880,
          fontSize: 56,
          fontWeight: 500,
            fontFamily: HEAD,
            textTransform: "uppercase",
          lineHeight: 1.05,
          letterSpacing: -1,
          color: accent,
          textWrap: "balance",
        }}
      >
        <T
          en="A title that runs on a single line, or two."
          gr="Ένας τίτλος σε μία ή δύο σειρές."
          lang={lang}
        />
      </div>

      {/* divider rule */}
      <div
        style={{
          position: "absolute",
          top: 290,
          left: 90,
          width: 60,
          height: 3,
          background: accent,
        }}
      />

      {/* body */}
      <div
        style={{
          position: "absolute",
          top: 340,
          left: 90,
          width: 880,
          fontSize: 22,
          lineHeight: 1.55,
          color: "rgba(11,31,38,0.85)",
        }}
      >
        <p style={{ margin: 0, marginBottom: 24, textWrap: "pretty" }}>
          <T
            en="Body copy sits below the title in a clear single column. It is set in the body type at 22pt with comfortable line-height, prioritising readability for printed reports and large rooms alike."
            gr="Το κυρίως κείμενο τοποθετείται κάτω από τον τίτλο σε μία στήλη. Είναι σε μέγεθος 22pt με άνετο ύψος γραμμής, δίνοντας προτεραιότητα στην αναγνωσιμότητα τόσο για έντυπες αναφορές όσο και για μεγάλες αίθουσες."
            lang={lang}
          />
        </p>
        <p style={{ margin: 0, textWrap: "pretty" }}>
          <T
            en="Use the accent rule above to signal a new content block. Keep paragraphs short — three to five sentences works best for spoken delivery."
            gr="Χρησιμοποιήστε τη γραμμή έμφασης πιο πάνω για να σηματοδοτήσετε ένα νέο τμήμα. Κρατήστε τις παραγράφους σύντομες — τρεις έως πέντε προτάσεις δουλεύουν καλύτερα προφορικά."
            lang={lang}
          />
        </p>
      </div>

      {/* small footnote */}
      <div
        style={{
          position: "absolute",
          left: 90,
          bottom: 110,
          width: 880,
          fontSize: 14,
          color: "rgba(11,31,38,0.5)",
          lineHeight: 1.4,
        }}
      >
        <T
          en="Source: NBG AI Hub portal analytics, 2026. Sandbox figures unless stated otherwise."
          gr="Πηγή: Αναλυτικά στοιχεία πύλης NBG AI Hub, 2026."
          lang={lang}
        />
      </div>

      {/* image right */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 820,
          height: "100%",
          overflow: "hidden",
        }}
      >
        <img
          src="../NBG-Design/assets/photo-developer-1.jpeg"
          alt=""
          onError={hidePhoto}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      <PageFooter pageNum="22" />
    </div>
  );
};

// CONTENT B — Two-column body, no image, light bg. The workhorse text slide.
window.ContentTwoColumn = function ContentTwoColumn({ accent = "#1C869D", lang = "en" }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "white",
        color: "#0B1F26",
        overflow: "hidden",
      }}
    >
      {/* eyebrow */}
      <div
        style={{
          position: "absolute",
          top: 70,
          left: 90,
          fontSize: 16,
          letterSpacing: 2.5,
          textTransform: "uppercase",
          color: accent,
          fontWeight: 700,
        }}
      >
        [ <T en="01 · Start" gr="01 · Ξεκίνημα" lang={lang} /> ]
      </div>

      <div
        style={{
          position: "absolute",
          top: 110,
          left: 90,
          right: 90,
          fontSize: 56,
          fontWeight: 500,
            fontFamily: HEAD,
            textTransform: "uppercase",
          lineHeight: 1.05,
          letterSpacing: -1,
          color: "#012A30",
          textWrap: "balance",
        }}
      >
        <T
          en="Three steps from sign-up to production."
          gr="Τρία βήματα από την εγγραφή στην παραγωγή."
          lang={lang}
        />
      </div>

      <div
        style={{
          position: "absolute",
          top: 290,
          left: 90,
          width: 60,
          height: 3,
          background: accent,
        }}
      />

      {/* three columns */}
      <div
        style={{
          position: "absolute",
          top: 340,
          left: 90,
          right: 90,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 48,
        }}
      >
        {[
          {
            n: "01",
            en_h: "Get access",
            gr_h: "Αποκτήστε πρόσβαση",
            en_b: "Sign up for an account, register an app, connect to an API.",
            gr_b: "Δημιουργήστε λογαριασμό, καταχωρίστε μια εφαρμογή, συνδεθείτε σε ένα API.",
          },
          {
            n: "02",
            en_h: "Build your app",
            gr_h: "Χτίστε την εφαρμογή σας",
            en_b: "Use the sandbox to experiment, then code and test against the provided test data.",
            gr_b: "Πειραματιστείτε στο sandbox, γράψτε κώδικα και δοκιμάστε με τα παρεχόμενα δεδομένα.",
          },
          {
            n: "03",
            en_h: "Get signed",
            gr_h: "Πάρτε έγκριση",
            en_b: "Request production access for your app and go live.",
            gr_b: "Ζητήστε πρόσβαση παραγωγής για την εφαρμογή σας και βγείτε live.",
          },
        ].map((c, i) => (
          <div key={i}>
            <div
              style={{
                fontSize: 64,
                fontWeight: 300,
            fontFamily: HEAD,
                color: accent,
                lineHeight: 1,
                letterSpacing: -2,
              }}
            >
              {c.n}
            </div>
            <div
              style={{
                marginTop: 24,
                fontSize: 26,
                fontWeight: 600,
                color: "#012A30",
                lineHeight: 1.2,
              }}
            >
              {lang === "gr" ? c.gr_h : lang === "bi" ? (
                <>
                  {c.en_h}
                  <span style={{ display: "block", opacity: 0.55, fontWeight: 400, marginTop: 4, fontSize: 22 }}>
                    {c.gr_h}
                  </span>
                </>
              ) : c.en_h}
            </div>
            <div
              style={{
                marginTop: 16,
                fontSize: 18,
                lineHeight: 1.55,
                color: "rgba(11,31,38,0.78)",
                textWrap: "pretty",
              }}
            >
              {lang === "gr" ? c.gr_b : lang === "bi" ? (
                <>
                  {c.en_b}
                  <div style={{ marginTop: 8, opacity: 0.55 }}>{c.gr_b}</div>
                </>
              ) : c.en_b}
            </div>
          </div>
        ))}
      </div>

      <PageFooter pageNum="07" />
    </div>
  );
};

// CONTENT C — Stat-led: one big number, supporting body
window.ContentStat = function ContentStat({ accent = "#33B3BF", lang = "en" }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#F3F6F8",
        color: "#012A30",
        overflow: "hidden",
      }}
    >
      {/* eyebrow */}
      <div
        style={{
          position: "absolute",
          top: 70,
          left: 90,
          fontSize: 16,
          letterSpacing: 2.5,
          textTransform: "uppercase",
          color: accent,
          fontWeight: 700,
        }}
      >
        [ <T en="03 · Metrics" gr="03 · Μετρήσεις" lang={lang} /> ]
      </div>

      <div
        style={{
          position: "absolute",
          top: 110,
          left: 90,
          right: 90,
          fontSize: 56,
          fontWeight: 500,
            fontFamily: HEAD,
            textTransform: "uppercase",
          lineHeight: 1.05,
          letterSpacing: -1,
          color: "#012A30",
          textWrap: "balance",
        }}
      >
        <T
          en="The year in numbers."
          gr="Η χρονιά σε αριθμούς."
          lang={lang}
        />
      </div>

      <div
        style={{
          position: "absolute",
          top: 290,
          left: 90,
          width: 60,
          height: 3,
          background: accent,
        }}
      />

      {/* big stat */}
      <div
        style={{
          position: "absolute",
          top: 360,
          left: 90,
          right: 90,
          display: "grid",
          gridTemplateColumns: "1.3fr 1fr",
          gap: 80,
          alignItems: "start",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 260,
              fontWeight: 300,
            fontFamily: HEAD,
              letterSpacing: -10,
              lineHeight: 0.9,
              color: "#012A30",
            }}
          >
            <span style={{ color: accent }}>+64</span>
            <span style={{ fontSize: 120, verticalAlign: "top", marginLeft: 8 }}>%</span>
          </div>
          <div
            style={{
              marginTop: 24,
              fontSize: 26,
              fontWeight: 400,
              color: "#012A30",
              maxWidth: 700,
              lineHeight: 1.3,
            }}
          >
            <T
              en="Year-on-year growth in API calls through the hub."
              gr="Ετήσια αύξηση κλήσεων API μέσω του hub."
              lang={lang}
            />
          </div>
        </div>

        <div style={{ paddingTop: 40 }}>
          {[
            { en_l: "Published APIs", gr_l: "Δημοσιευμένα APIs", v: "42" },
            { en_l: "Registered developers", gr_l: "Εγγεγραμμένοι developers", v: "18.3k" },
            { en_l: "Sandbox calls per month", gr_l: "Κλήσεις sandbox ανά μήνα", v: "2.1m" },
            { en_l: "Median time to first call", gr_l: "Διάμεσος χρόνος πρώτης κλήσης", v: "11 min" },
          ].map((row, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                padding: "22px 0",
                borderBottom: "1px solid rgba(1,42,48,0.12)",
              }}
            >
              <span style={{ fontSize: 20, color: "rgba(1,42,48,0.7)" }}>
                {lang === "gr" ? row.gr_l : row.en_l}
              </span>
              <span
                style={{
                  fontSize: 32,
                  fontWeight: 500,
                  fontFamily: HEAD,   // data numeral: Oswald 500, tabular, no tracking (display numerals are 300)
                  letterSpacing: 0,
                  color: "#012A30",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {row.v}
              </span>
            </div>
          ))}
        </div>
      </div>

      <PageFooter pageNum="48" />
    </div>
  );
};
