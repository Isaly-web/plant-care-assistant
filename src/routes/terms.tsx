import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, Todo, type LegalSection } from "@/components/legal/LegalPage";
import { APP_NAME, SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/app-config";

// Structure only — the binding legal/business wording must come from Isaly.
// Everything marked <Todo> is a placeholder, not a commitment.

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: `Användarvillkor – ${APP_NAME}` },
      { name: "description", content: `Villkor för att använda ${APP_NAME}.` },
    ],
  }),
});

const sections: LegalSection[] = [
  {
    id: "om-tjansten",
    heading: "Om tjänsten",
    body: (
      <>
        <p>{APP_NAME} tillhandahålls av Isaly AB, organisationsnummer 559472-5763.</p>
        <p>
          Tjänsten hjälper dig att hålla koll på dina växter: skötselschema, påminnelser, skörd samt
          identifiering och diagnos utifrån foton.
        </p>
      </>
    ),
  },
  {
    id: "bedomningar",
    heading: "Automatiska bedömningar",
    body: (
      <>
        <p>
          Växtidentifiering, diagnos och skötselråd är automatiska bedömningar som kan vara
          felaktiga. Du ansvarar för hur du använder dem, särskilt innan du äter eller ger bort
          något du odlat.
        </p>
        <p>
          <Todo>ANSVARSBEGRÄNSNING OCH GARANTIER – BEKRÄFTA MED JURIST</Todo>
        </p>
      </>
    ),
  },
  {
    id: "konto",
    heading: "Konto",
    body: (
      <p>
        Du ansvarar för ditt konto och för att hålla dina inloggningsuppgifter hemliga. Din
        inloggning delas med andra Isaly-appar.
      </p>
    ),
  },
  {
    id: "pris",
    heading: "Pris och betalning",
    body: (
      <p>
        <Todo>PRISMODELL OCH BETALVILLKOR (om tjänsten blir avgiftsbelagd)</Todo>
      </p>
    ),
  },
  {
    id: "support",
    heading: "Support",
    body: (
      <p>
        Frågor? Kontakta <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>. Se även vår{" "}
        <Link to="/privacy">integritetspolicy</Link>.
      </p>
    ),
  },
  {
    id: "andringar",
    heading: "Ändringar och uppsägning",
    body: (
      <p>
        <Todo>VILLKOR FÖR ÄNDRINGAR AV VILLKOREN OCH AVSLUT AV KONTO</Todo>
      </p>
    ),
  },
];

function TermsPage() {
  return (
    <LegalPage
      title="Användarvillkor"
      lastUpdated="2026-11-03"
      intro={<p>Genom att använda {APP_NAME} godkänner du de här villkoren.</p>}
      sections={sections}
    />
  );
}
