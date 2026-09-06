// NBG slide templates — each is a 1920x1080 deck artboard.
// Wrap them in <SlideFrame> in the host doc to scale into the layout.

const { useState } = React;

// ---- shared bits ----------------------------------------------------------

const LogoMark = ({ variant = "primary", height = 56 }) => {
  const src =
    variant === "knockout"
      ? "assets/logo-knockout.png"
      : variant === "small"
      ? "assets/logo-small.png"
      : "assets/logo-primary.png";
  return <img src={src} alt="NBG" style={{ height, width: "auto", display: "block" }} />;
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
      color: dark ? "rgba(255,255,255,0.7)" : "rgba(0,56,65,0.55)",
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
window.Cover1 = function Cover1({ accent = "#003841", lang = "en", showLogo = true }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#0A1416",
        color: "white",
        overflow: "hidden",
      }}
    >
      {/* right image block — slightly inset, generous corner radius */}
      <div
        style={{
          position: "absolute",
          top: 100,
          right: 60,
          width: 720,
          height: 880,
          borderRadius: 18,
          overflow: "hidden",
          background: `linear-gradient(135deg, ${accent} 0%, #001A1F 100%)`,
        }}
      >
        <img
          src="assets/photo-street.jpeg"
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.92,
            mixBlendMode: "normal",
          }}
        />
      </div>

      {/* subtle vignette over image left edge → blends into deep bg */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 780,
          width: 240,
          height: "100%",
          background: "linear-gradient(90deg, transparent 0%, #0A1416 100%)",
        }}
      />

      {/* left copy block */}
      <div style={{ position: "absolute", top: 220, left: 90, maxWidth: 900 }}>
        <div
          style={{
            fontSize: 88,
            lineHeight: 0.95,
            fontWeight: 300,
            letterSpacing: -1.5,
            color: "#F5F8F6",
            textWrap: "balance",
          }}
        >
          <T
            en={
              <>
                Placeholder title
                <br />
                <span style={{ color: "#00CFE7" }}>that may run on two lines.</span>
              </>
            }
            gr={
              <>
                Τίτλος εξωφύλλου
                <br />
                <span style={{ color: "#00CFE7" }}>σε δύο σειρές.</span>
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
            en="Subtitle text describing the report, audience or programme."
            gr="Υπότιτλος που περιγράφει την αναφορά, το κοινό ή το πρόγραμμα."
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
          <div>Meeting Location / Description</div>
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
window.Cover2 = function Cover2({ accent = "#007B85", lang = "en", showLogo = true }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#F5F8F6",
        color: "#003841",
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
          boxShadow: "0 30px 80px -30px rgba(0,56,65,0.4)",
        }}
      >
        <img
          src="assets/photo-parthenon.jpeg"
          alt=""
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
        <T en="Annual Report" gr="Ετήσια Έκθεση" lang={lang} />
      </div>

      {/* title */}
      <div
        style={{
          position: "absolute",
          top: 300,
          left: 90,
          width: 880,
          fontSize: 96,
          fontWeight: 300,
          lineHeight: 0.96,
          letterSpacing: -2,
          color: "#003841",
          textWrap: "balance",
        }}
      >
        <T
          en={
            <>
              Building <span style={{ fontStyle: "italic", fontWeight: 400 }}>tomorrow</span>,
              today.
            </>
          }
          gr={
            <>
              Χτίζοντας το <span style={{ fontStyle: "italic", fontWeight: 400 }}>αύριο</span>,
              σήμερα.
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
          color: "rgba(0,56,65,0.78)",
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
            color: "rgba(0,56,65,0.7)",
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
window.Cover3 = function Cover3({ accent = "#00ADBF", lang = "en", showLogo = true }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#003841",
        color: "white",
        overflow: "hidden",
      }}
    >
      {/* subtle horizontal lines pattern */}
      <svg
        width="100%"
        height="100%"
        style={{ position: "absolute", inset: 0, opacity: 0.06 }}
        aria-hidden
      >
        <defs>
          <pattern id="lines" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M0 40 L40 0" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#lines)" />
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
          fontWeight: 200,
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
        <T en="Strategy Update — Q1 2026" gr="Στρατηγική — Α′ Τρίμηνο 2026" lang={lang} />
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
          fontWeight: 300,
          letterSpacing: -2,
          color: "#F5F8F6",
          textWrap: "balance",
        }}
      >
        <T
          en={
            <>
              A clear voice
              <br />
              <span style={{ color: accent, fontWeight: 400, fontStyle: "italic" }}>
                in changing times.
              </span>
            </>
          }
          gr={
            <>
              Μια καθαρή φωνή
              <br />
              <span style={{ color: accent, fontWeight: 400, fontStyle: "italic" }}>
                σε εποχές αλλαγής.
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
            color: "rgba(245,248,246,0.7)",
            textAlign: "right",
            lineHeight: 1.5,
          }}
        >
          <div>Investor Day</div>
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
window.DividerImage = function DividerImage({ accent = "#00CFE7", lang = "en" }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#003841",
        color: "white",
        overflow: "hidden",
      }}
    >
      {/* image card right */}
      <div
        style={{
          position: "absolute",
          top: 100,
          right: 60,
          width: 1100,
          height: 880,
          borderRadius: 24,
          overflow: "hidden",
        }}
      >
        <img
          src="assets/photo-fields.jpeg"
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      {/* huge number */}
      <div
        style={{
          position: "absolute",
          top: 360,
          left: 80,
          fontSize: 220,
          fontWeight: 200,
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
          fontWeight: 300,
          lineHeight: 1,
          letterSpacing: -1,
          color: "#F5F8F6",
        }}
      >
        <T en="Divider" gr="Ενότητα" lang={lang} />
      </div>

      <div
        style={{
          position: "absolute",
          top: 700,
          left: 90,
          width: 580,
          fontSize: 22,
          lineHeight: 1.4,
          color: "rgba(245,248,246,0.7)",
        }}
      >
        <T
          en="A short caption sets up the section's argument, who it concerns and why it matters."
          gr="Μια σύντομη λεζάντα εισάγει το επιχείρημα της ενότητας, ποιους αφορά και γιατί έχει σημασία."
          lang={lang}
        />
      </div>

      <PageFooter pageNum="14" dark ftrLabel={lang === "gr" ? "Ενότητα 02" : "Section 02"} />
    </div>
  );
};

// DIVIDER B — Dark teal, type-only. Quietest section opener.
window.DividerDark = function DividerDark({ accent = "#00CFE7", lang = "en" }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#003841",
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
          fontWeight: 200,
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
          fontWeight: 300,
          lineHeight: 1,
          letterSpacing: -2,
          color: "#F5F8F6",
          textWrap: "balance",
        }}
      >
        <T en="Looking ahead." gr="Κοιτώντας μπροστά." lang={lang} />
      </div>

      <div
        style={{
          position: "absolute",
          top: 580,
          left: 580,
          right: 90,
          fontSize: 26,
          lineHeight: 1.4,
          color: "rgba(245,248,246,0.7)",
          maxWidth: 720,
        }}
      >
        <T
          en="A paragraph of supporting copy describes what this section covers and the questions it answers."
          gr="Μια παράγραφος υποστηρικτικού κειμένου περιγράφει τι καλύπτει αυτή η ενότητα και τα ερωτήματα στα οποία απαντά."
          lang={lang}
        />
      </div>

      <PageFooter pageNum="38" dark ftrLabel={lang === "gr" ? "Ενότητα 03" : "Section 03"} />
    </div>
  );
};

// DIVIDER C — Brights — light cream with bright cyan typographic moment.
window.DividerBright = function DividerBright({ accent = "#00ADBF", lang = "en" }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#F5F8F6",
        color: "#003841",
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
        <T en="Section 04" gr="Ενότητα 04" lang={lang} />
      </div>

      {/* number + label */}
      <div
        style={{
          position: "absolute",
          top: 220,
          left: 90,
          fontSize: 320,
          fontWeight: 200,
          lineHeight: 0.9,
          letterSpacing: -12,
          color: "#003841",
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
          fontWeight: 300,
          letterSpacing: -1.5,
          color: "#003841",
          textWrap: "balance",
          maxWidth: 1000,
          lineHeight: 1,
        }}
      >
        <T en="People & Culture" gr="Άνθρωποι & Κουλτούρα" lang={lang} />
      </div>

      <div
        style={{
          position: "absolute",
          top: 730,
          left: 90,
          fontSize: 24,
          lineHeight: 1.4,
          color: "rgba(0,56,65,0.7)",
          maxWidth: 800,
        }}
      >
        <T
          en="How we invest in our teams, the communities we serve, and the next generation of Greek talent."
          gr="Πώς επενδύουμε στις ομάδες μας, στις κοινότητες που εξυπηρετούμε και στη νέα γενιά ελληνικού ταλέντου."
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
window.ContentImageRight = function ContentImageRight({ accent = "#003841", lang = "en" }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "white",
        color: "#1A1F22",
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
        <T en="02 · People" gr="02 · Άνθρωποι" lang={lang} />
      </div>

      {/* title */}
      <div
        style={{
          position: "absolute",
          top: 110,
          left: 90,
          width: 880,
          fontSize: 56,
          fontWeight: 300,
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
          color: "rgba(26,31,34,0.85)",
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
          color: "rgba(26,31,34,0.5)",
          lineHeight: 1.4,
        }}
      >
        <T
          en="Source: Internal data, FY2025. All figures unaudited unless otherwise stated."
          gr="Πηγή: Εσωτερικά στοιχεία, οικονομικό έτος 2025."
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
          src="assets/photo-skate.jpeg"
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      <PageFooter pageNum="22" />
    </div>
  );
};

// CONTENT B — Two-column body, no image, light bg. The workhorse text slide.
window.ContentTwoColumn = function ContentTwoColumn({ accent = "#007B85", lang = "en" }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "white",
        color: "#1A1F22",
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
        <T en="01 · Strategy" gr="01 · Στρατηγική" lang={lang} />
      </div>

      <div
        style={{
          position: "absolute",
          top: 110,
          left: 90,
          right: 90,
          fontSize: 56,
          fontWeight: 300,
          lineHeight: 1.05,
          letterSpacing: -1,
          color: "#003841",
          textWrap: "balance",
        }}
      >
        <T
          en="Three pillars carry the plan forward."
          gr="Τρεις πυλώνες στηρίζουν το σχέδιο."
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
            en_h: "Customer first",
            gr_h: "Ο πελάτης πρώτος",
            en_b: "Re-platform digital channels with a single sign-on, faster onboarding and a refreshed mobile experience.",
            gr_b: "Επανασχεδιασμός των ψηφιακών καναλιών με ενιαία σύνδεση, ταχύτερη ενσωμάτωση και ανανεωμένη εμπειρία κινητού.",
          },
          {
            n: "02",
            en_h: "Sustainable growth",
            gr_h: "Βιώσιμη ανάπτυξη",
            en_b: "Channel capital into green lending, SME support and renewable infrastructure across the Greek market.",
            gr_b: "Διοχέτευση κεφαλαίων σε πράσινες χρηματοδοτήσεις, ΜμΕ και υποδομές ανανεώσιμων στην ελληνική αγορά.",
          },
          {
            n: "03",
            en_h: "People & culture",
            gr_h: "Άνθρωποι & κουλτούρα",
            en_b: "Invest in our teams through new learning programmes, cross-functional mobility and clearer career paths.",
            gr_b: "Επενδύουμε στις ομάδες μας μέσω νέων προγραμμάτων μάθησης, κινητικότητας και σαφέστερων προοπτικών.",
          },
        ].map((c, i) => (
          <div key={i}>
            <div
              style={{
                fontSize: 64,
                fontWeight: 200,
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
                color: "#003841",
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
                color: "rgba(26,31,34,0.78)",
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
window.ContentStat = function ContentStat({ accent = "#00ADBF", lang = "en" }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#F5F8F6",
        color: "#003841",
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
        <T en="03 · Performance" gr="03 · Επιδόσεις" lang={lang} />
      </div>

      <div
        style={{
          position: "absolute",
          top: 110,
          left: 90,
          right: 90,
          fontSize: 56,
          fontWeight: 300,
          lineHeight: 1.05,
          letterSpacing: -1,
          color: "#003841",
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
              fontWeight: 200,
              letterSpacing: -10,
              lineHeight: 0.9,
              color: "#003841",
            }}
          >
            <span style={{ color: accent }}>+12.4</span>
            <span style={{ fontSize: 120, verticalAlign: "top", marginLeft: 8 }}>%</span>
          </div>
          <div
            style={{
              marginTop: 24,
              fontSize: 26,
              fontWeight: 400,
              color: "#003841",
              maxWidth: 700,
              lineHeight: 1.3,
            }}
          >
            <T
              en="Year-on-year growth in net interest income."
              gr="Ετήσια αύξηση καθαρών εσόδων από τόκους."
              lang={lang}
            />
          </div>
        </div>

        <div style={{ paddingTop: 40 }}>
          {[
            { en_l: "Operating income", gr_l: "Λειτουργικά έσοδα", v: "€2.61b" },
            { en_l: "Cost / income ratio", gr_l: "Δείκτης κόστος / έσοδα", v: "32.4%" },
            { en_l: "CET1 ratio", gr_l: "Δείκτης CET1", v: "18.7%" },
            { en_l: "Active customers", gr_l: "Ενεργοί πελάτες", v: "5.4m" },
          ].map((row, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                padding: "22px 0",
                borderBottom: "1px solid rgba(0,56,65,0.12)",
              }}
            >
              <span style={{ fontSize: 20, color: "rgba(0,56,65,0.7)" }}>
                {lang === "gr" ? row.gr_l : row.en_l}
              </span>
              <span
                style={{
                  fontSize: 32,
                  fontWeight: 500,
                  color: "#003841",
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
