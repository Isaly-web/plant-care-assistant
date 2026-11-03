import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, Todo, type LegalSection } from "@/components/legal/LegalPage";
import { APP_NAME, SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/app-config";

// Content reflects what the repository actually does. Anything Isaly must decide or confirm is
// marked with <Todo>. Do not remove a TODO without a legal/business decision behind the
// replacement text. List only subprocessors the code actually uses.

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: `Integritetspolicy – ${APP_NAME}` },
      { name: "description", content: `Hur ${APP_NAME} behandlar personuppgifter.` },
    ],
  }),
});

const sections: LegalSection[] = [
  {
    id: "personuppgiftsansvarig",
    heading: "Personuppgiftsansvarig",
    body: (
      <>
        <p>
          Personuppgiftsansvarig är Isaly AB, organisationsnummer 559472-5763, Grimmeredsvägen 45,
          426&nbsp;69 Västra Frölunda.
        </p>
        <p>
          Kontakt i integritetsfrågor: <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a> eller per post
          till Isaly AB, Grimmeredsvägen 45, 426&nbsp;69 Västra Frölunda.
        </p>
      </>
    ),
  },
  {
    id: "uppgifter",
    heading: "Vilka uppgifter vi behandlar",
    body: (
      <ul>
        <li>
          Konto: e-postadress och inloggningsuppgifter (lösenord lagras hashat av Supabase Auth).
        </li>
        <li>
          Dina växter, det du själv anger: namn, art, sort, foto, plats, om de står inne eller ute,
          inköpsdatum, ungefärlig ålder och anteckningar.
        </li>
        <li>Skötseluppgifter, skördar och notiser som skapas för dina växter.</li>
        <li>
          Foton du laddar upp, och resultat av växtidentifiering och växtdiagnos som sparas i din
          historik.
        </li>
        <li>Orter som används för väderbaserade skötselråd.</li>
        <li>Feedback du skickar via feedbackknappen, tillsammans med din e-postadress.</li>
      </ul>
    ),
  },
  {
    id: "andamal",
    heading: "Ändamål och rättslig grund",
    body: (
      <p>
        Vi behandlar uppgifterna för att tillhandahålla tjänsten (skötselschema, identifiering och
        diagnos av växter) och för att felsöka och förbättra den.{" "}
        <Todo>RÄTTSLIG GRUND PER ÄNDAMÅL – BEKRÄFTA</Todo>
      </p>
    ),
  },
  {
    id: "underbitraden",
    heading: "Underbiträden",
    body: (
      <ul>
        <li>Supabase (databas, inloggning och fillagring av foton), EU-region (Stockholm).</li>
        <li>
          Vercel (drift och leverans av webbappen).{" "}
          <Todo>BEKRÄFTA REGION OCH ÖVERFÖRINGSMEKANISM</Todo>
        </li>
        <li>
          Google (Gemini API): foton du laddar upp skickas dit när du ber om växtidentifiering eller
          växtdiagnos.
        </li>
        <li>Isaly Feedback Hub (mottagning av feedback du skickar).</li>
      </ul>
    ),
  },
  {
    id: "lagring",
    heading: "Hur länge uppgifterna sparas",
    body: (
      <p>
        Uppgifterna sparas så länge du har ett konto.{" "}
        <Todo>BEKRÄFTA RETENTIONSTIDER (FOTON, AI-RESULTAT, LOGGAR, FEEDBACK)</Todo>
      </p>
    ),
  },
  {
    id: "rattigheter",
    heading: "Dina rättigheter",
    body: (
      <p>
        Du har rätt till tillgång, rättelse och, i den mån lagen tillåter, radering, begränsning och
        dataportabilitet. Kontakta <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>. Vi svarar utan
        onödigt dröjsmål och senast inom en månad.
      </p>
    ),
  },
  {
    id: "radering",
    heading: "Radera ditt konto",
    body: (
      <p>
        Ditt Isaly-konto delas med andra Isaly-appar, så en app får inte radera själva kontot. Appen
        har ännu ingen funktion där du själv raderar dina uppgifter; kontakta{" "}
        <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a> så hjälper vi dig.{" "}
        <Todo>BESKRIV HUR RADERING AV APPENS DATA OCH DET GEMENSAMMA ISALY-KONTOT HANTERAS</Todo>
      </p>
    ),
  },
  {
    id: "andringar",
    heading: "Ändringar",
    body: (
      <p>
        Vi kan uppdatera den här policyn. Datumet högst upp visar när den senast ändrades. Se även
        våra <Link to="/terms">användarvillkor</Link>.
      </p>
    ),
  },
];

function PrivacyPage() {
  return (
    <LegalPage
      title="Integritetspolicy"
      lastUpdated="2026-11-03"
      intro={<p>Den här policyn beskriver hur {APP_NAME} behandlar personuppgifter.</p>}
      sections={sections}
    />
  );
}
