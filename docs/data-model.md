# Datamodell

Alla tabeller lever i Postgres-schemat **`plant_care`** i det delade Supabase-projektet
`isaly-apps-prod` (samma projekt som `happy-hen-history` använder). Schemat är valt istället för
`public` av två skäl: det håller Plant Care Assistant helt isolerat från andra Isaly-appars
tabeller (t.ex. finns redan en `public.notifications` för en annan app), och det gör RLS-policyer
enkla att resonera om per app.

Källa: [`supabase/migrations/20260818160000_plant_care_schema_init.sql`](../supabase/migrations/20260818160000_plant_care_schema_init.sql)
och [`20260818161500_plant_care_storage_bucket.sql`](../supabase/migrations/20260818161500_plant_care_storage_bucket.sql).

## Tabeller

### `plant_species`
Delad referensdata (växtdatabasen) — inte kopplad till en användare. RLS: alla inloggade får
läsa, ingen klient får skriva (endast via migrationer/service-nycklar).

| Kolumn | Typ | Beskrivning |
|---|---|---|
| `name` | text | t.ex. "Citronträd" |
| `category` | text | `indoor` \| `mediterranean` \| `flower` \| `fruit_tree` \| `berry` \| `other` |
| `emoji` | text | Ikon som används genomgående i UI:t |
| `watering_interval_days` | int | Standardintervall för vattning |
| `fertilizing_interval_days` | int? | Standardintervall för gödsling |
| `pruning_period` | text? | Fritextperiod, t.ex. "Februari–mars" |
| `planting_period` | text? | Fritextperiod |
| `harvest_start_month` / `harvest_end_month` | int? (1–12) | Förväntad skördeperiod |
| `min_temperature_c` | numeric? | Frost-/kylgräns som regelmotorn jämför prognosen mot |
| `frost_sensitive` | boolean | Styr om frostregeln alls kan slå till |
| `winter_strategy` | text? | Rekommenderad vinterförvaring |
| `indoor_outdoor` | text | `indoor` \| `outdoor` \| `both` |

### `plants`
En användares egna växter. RLS: `user_id = auth.uid()` på alla operationer.

Innehåller `species_id` (valfri koppling till `plant_species` för automatiska rekommendationer)
samt fria fält `species`/`variety` (Art/Sort som texten användaren skrev in), plats,
inne/ute, kruka/mark, inköpsdatum, ålder, anteckningar — och valfria `custom_*`-fält som
override:ar artens standardintervall/frostgräns per planta.

### `care_tasks`
Fungerar som **både** logg och påminnelse:
- En rad med `completed_at` satt = en historikpost ("vattnade 12 augusti").
- En rad utan `completed_at` och `source = 'manual'` = en användarskapad påminnelse med `due_date`.

Regelmotorns rekommendationer (frost, vattning, gödsling, skörd) räknas fram **live** från den
senaste `completed_at` per `task_type` — de lagras inte som egna rader förrän användaren trycker
"Klar", vilket då loggar dem med `source = 'rule_engine'`. Det håller "senaste utförd"/"nästa
rekommenderade" alltid konsekvent utan synk-logik.

### `harvests`
En skörderad per registrering: datum, vad, mängd, enhet, anteckning, foto.

### `weather_snapshots`
Cache av `WeatherService`s prognos per `(user_id, location, forecast_date)` — så att
Dashboarden inte behöver anropa vädertjänsten på varje render. `source` är `mock` i MVP:t.

### `notifications`
Strukturen för framtida push-notiser: titel, meddelande, prioritet, typ, koppling till
växt/uppgift, och status (`pending` → `sent` → `read`). Skrivs redan idag av
`notificationService.ts`, men skickas inte som riktig push ännu.

## RLS-principer

- Alla användartabeller har `user_id uuid not null default auth.uid() references auth.users(id)`
  och fyra policyer (select/insert/update/delete) som kräver `user_id = auth.uid()`.
- `plant_species` har bara en select-policy (`using (true)` för `authenticated`) — ingen
  insert/update/delete-policy finns, så klienter kan aldrig skriva dit.
- Storage-bucketen `plant-care-photos` är publik för läsning (så bilder kan visas utan signerade
  URL:er) men skrivning kräver att första mappnivån i sökvägen matchar `auth.uid()`.

## Varför inte `households`/`profiles`?

`isaly-apps-prod` har redan `public.households`, `public.profiles` m.fl. från `happy-hen-history`
— de är den appens domänmodell (hönsflockar, plan-nivåer) och återanvänds inte här. Det enda som
delas mellan apparna är **Supabase Auth** (`auth.users`): samma inloggning fungerar i båda apparna,
men respektive apps data är helt separerad.
