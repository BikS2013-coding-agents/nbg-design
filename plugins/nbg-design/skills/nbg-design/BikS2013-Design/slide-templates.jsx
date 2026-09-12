// BikS2013 slide templates — each is a 1920x1080 deck artboard. Same geometry as the NBG
// templates, re-themed: ink and copper on warm paper, the BikS2013 bicycle lockups, personal copy.
// Photos: assets/photo-<stem>.jpeg of the BikS2013 theme; a missing photo hides itself (hidePhoto)
// and the panel's own background shows, so the templates render before the photo set is chosen.
// Wrap them in <SlideFrame> in the host doc to scale into the layout.

const { useState } = React;

const hidePhoto = (e) => { e.currentTarget.style.display = "none"; };

// ---- shared bits ----------------------------------------------------------

const LogoMark = ({ variant = "primary", height = 56 }) => {
  const src =
    variant === "knockout"
      ? "assets/logo-knockout.png"
      : variant === "small"
      ? "assets/logo-small.png"
      : "assets/logo-primary.png";
  return <img src={src} alt="BikS2013" style={{ height, width: "auto", display: "block" }} />;
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
      color: dark ? "rgba(255,255,255,0.7)" : "rgba(27,29,33,0.55)",
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

// COVER 1 — Hero image right, soft fade to ink on left where copy lives.
// Faithful to the original "1_Cover" geometry: copy occupies left ~60%,
// image (or color block) occupies a tall freeform on the right.
window.Cover1 = function Cover1({ accent = "#1B1D21", lang = "en", showLogo = true }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#111316",
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
          background: `linear-gradient(135deg, ${accent} 0%, #0F1113 100%)`,
        }}
      >
        <img
          src="assets/photo-city-ride.jpeg"
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

      {/* subtle vignette over image left edge → blends into deep bg */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 780,
          width: 240,
          height: "100%",
          background: "linear-gradient(90deg, transparent 0%, #111316 100%)",
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
            color: "#F6F3EC",
            textWrap: "balance",
          }}
        >
          <T
            en={
              <>
                Placeholder title
                <br />
                <span style={{ color: "#E08A5E" }}>that may run on two lines.</span>
              </>
            }
            gr={
              <>
                Τίτλος εξωφύλλου
                <br />
                <span style={{ color: "#E08A5E" }}>σε δύο σειρές.</span>
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
          <div>Talk · Meetup · Workshop</div>
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
// type sits on warm paper background left.
window.Cover2 = function Cover2({ accent = "#C8623A", lang = "en", showLogo = true }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#F6F3EC",
        color: "#1B1D21",
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
          boxShadow: "0 30px 80px -30px rgba(27,29,33,0.4)",
        }}
      >
        <img
          src="assets/photo-road-dawn.jpeg"
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
        <T en="Field notes" gr="Σημειώσεις πεδίου" lang={lang} />
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
          color: "#1B1D21",
          textWrap: "balance",
        }}
      >
        <T
          en={
            <>
              Small tools, <span style={{ fontStyle: "italic", fontWeight: 400 }}>sharp</span>
              results.
            </>
          }
          gr={
            <>
              Μικρά εργαλεία, <span style={{ fontStyle: "italic", fontWeight: 400 }}>κοφτερά</span>
              αποτελέσματα.
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
          color: "rgba(27,29,33,0.78)",
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
            color: "rgba(27,29,33,0.7)",
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
window.Cover3 = function Cover3({ accent = "#C8623A", lang = "en", showLogo = true }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#1B1D21",
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
        <T en="Coding agents — 2026" gr="Πράκτορες κώδικα — 2026" lang={lang} />
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
          color: "#F6F3EC",
          textWrap: "balance",
        }}
      >
        <T
          en={
            <>
              A clear head
              <br />
              <span style={{ color: accent, fontWeight: 400, fontStyle: "italic" }}>
                in a noisy field.
              </span>
            </>
          }
          gr={
            <>
              Καθαρό μυαλό
              <br />
              <span style={{ color: accent, fontWeight: 400, fontStyle: "italic" }}>
                σε θορυβώδες πεδίο.
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
            color: "rgba(246,243,236,0.7)",
            textAlign: "right",
            lineHeight: 1.5,
          }}
        >
          <div>BikS2013 · talk</div>
          <div>Athens · 14 March 2026</div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// DIVIDERS
// ============================================================================

// DIVIDER A — Ink, type-led with big number on left, image card on right.
window.DividerImage = function DividerImage({ accent = "#E08A5E", lang = "en" }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#1B1D21",
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
          background: "#2E3238",
        }}
      >
        <img
          src="assets/photo-workshop-bike.jpeg"
          alt=""
          onError={hidePhoto}
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
          color: "#F6F3EC",
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
          color: "rgba(246,243,236,0.7)",
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

// DIVIDER B — Ink, type-only. Quietest section opener.
window.DividerDark = function DividerDark({ accent = "#E08A5E", lang = "en" }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#1B1D21",
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
          color: "#F6F3EC",
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
          color: "rgba(246,243,236,0.7)",
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

// DIVIDER C — Brights — warm paper with a copper typographic moment.
window.DividerBright = function DividerBright({ accent = "#C8623A", lang = "en" }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#F6F3EC",
        color: "#1B1D21",
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
          color: "#1B1D21",
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
          color: "#1B1D21",
          textWrap: "balance",
          maxWidth: 1000,
          lineHeight: 1,
        }}
      >
        <T en="Tools & Workflow" gr="Εργαλεία & Ροή εργασίας" lang={lang} />
      </div>

      <div
        style={{
          position: "absolute",
          top: 730,
          left: 90,
          fontSize: 24,
          lineHeight: 1.4,
          color: "rgba(27,29,33,0.7)",
          maxWidth: 800,
        }}
      >
        <T
          en="The small, sharp tools behind the work — and how they fit together into one repeatable workflow."
          gr="Τα μικρά, κοφτερά εργαλεία πίσω από τη δουλειά — και πώς δένουν σε μία επαναλήψιμη ροή."
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
window.ContentImageRight = function ContentImageRight({ accent = "#1B1D21", lang = "en" }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "white",
        color: "#1B1D21",
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
        <T en="02 · Practice" gr="02 · Πρακτική" lang={lang} />
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
          color: "rgba(27,29,33,0.85)",
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
          color: "rgba(27,29,33,0.5)",
          lineHeight: 1.4,
        }}
      >
        <T
          en="Source: BikS2013 project notes, 2026. Figures come from personal projects unless stated otherwise."
          gr="Πηγή: Σημειώσεις έργων BikS2013, 2026."
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
          background: "#2E3238",
        }}
      >
        <img
          src="assets/photo-home-office.jpeg"
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
window.ContentTwoColumn = function ContentTwoColumn({ accent = "#C8623A", lang = "en" }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "white",
        color: "#1B1D21",
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
        <T en="01 · Principles" gr="01 · Αρχές" lang={lang} />
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
          color: "#1B1D21",
          textWrap: "balance",
        }}
      >
        <T
          en="Three principles carry the work forward."
          gr="Τρεις αρχές στηρίζουν τη δουλειά."
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
            en_h: "Agents first",
            gr_h: "Πρώτα οι πράκτορες",
            en_b: "Give every repeatable task to a coding agent with a clear brief, a test to pass and a place to write its notes.",
            gr_b: "Κάθε επαναλαμβανόμενη εργασία πάει σε έναν πράκτορα κώδικα με σαφή οδηγία, ένα τεστ που πρέπει να περάσει και ένα σημείο για τις σημειώσεις του.",
          },
          {
            n: "02",
            en_h: "Small, sharp tools",
            gr_h: "Μικρά, κοφτερά εργαλεία",
            en_b: "Prefer zero-dependency scripts that do one thing, document themselves and run anywhere a shell runs.",
            gr_b: "Προτίμηση σε σενάρια χωρίς εξαρτήσεις που κάνουν ένα πράγμα, τεκμηριώνονται μόνα τους και τρέχουν όπου τρέχει ένα κέλυφος.",
          },
          {
            n: "03",
            en_h: "Ship, then explain",
            gr_h: "Παράδοση, μετά εξήγηση",
            en_b: "Deliver the working thing first; the write-up, the diagram and the talk follow from what actually shipped.",
            gr_b: "Πρώτα το λειτουργικό αποτέλεσμα· η τεκμηρίωση, το διάγραμμα και η ομιλία ακολουθούν ό,τι πραγματικά παραδόθηκε.",
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
                color: "#1B1D21",
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
                color: "rgba(27,29,33,0.78)",
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
window.ContentStat = function ContentStat({ accent = "#C8623A", lang = "en" }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#F6F3EC",
        color: "#1B1D21",
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
        <T en="03 · Numbers" gr="03 · Αριθμοί" lang={lang} />
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
          color: "#1B1D21",
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
              color: "#1B1D21",
            }}
          >
            <span style={{ color: accent }}>−38</span>
            <span style={{ fontSize: 120, verticalAlign: "top", marginLeft: 8 }}>%</span>
          </div>
          <div
            style={{
              marginTop: 24,
              fontSize: 26,
              fontWeight: 400,
              color: "#1B1D21",
              maxWidth: 700,
              lineHeight: 1.3,
            }}
          >
            <T
              en="Fewer hours from idea to merged pull request, year on year."
              gr="Λιγότερες ώρες από την ιδέα στο συγχωνευμένο pull request, έτος με έτος."
              lang={lang}
            />
          </div>
        </div>

        <div style={{ paddingTop: 40 }}>
          {[
            { en_l: "Agents in daily use", gr_l: "Πράκτορες σε καθημερινή χρήση", v: "6" },
            { en_l: "Pull requests merged", gr_l: "Συγχωνευμένα pull requests", v: "412" },
            { en_l: "Tests green on first run", gr_l: "Τεστ πράσινα με την πρώτη", v: "91%" },
            { en_l: "Median cycle time", gr_l: "Διάμεσος χρόνος κύκλου", v: "3.2 h" },
          ].map((row, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                padding: "22px 0",
                borderBottom: "1px solid rgba(27,29,33,0.12)",
              }}
            >
              <span style={{ fontSize: 20, color: "rgba(27,29,33,0.7)" }}>
                {lang === "gr" ? row.gr_l : row.en_l}
              </span>
              <span
                style={{
                  fontSize: 32,
                  fontWeight: 500,
                  color: "#1B1D21",
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
