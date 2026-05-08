# UI Redesign Roadmap

> Review esterna del prodotto (maggio 2026). Score identità visiva: **5.5/10**. **37 fix totali**, ordinati per sprint.
> Diagnosi: il design system è solido e intenzionale, ma solo parzialmente implementato. Il gap principale non è estetico: è strutturale. La landing è sorprendentemente più solida dell'app. Il problema emergente dalle schermate dell'app è la disconnessione tra la qualità del copy tecnico (molto buono) e la qualità dell'interaction design per le azioni critiche — reveal, create, edit.

**Note operative:**
- **Fase 1, fix #1 e #9** (font globale + token `textMuted`) sono ~1 ora di lavoro ciascuno ma hanno il maggiore impatto visivo dell'intero backlog.
- **Fix #10** (`:focus-visible`) sono 6 righe di CSS che risolvono simultaneamente tutti i problemi di keyboard focus.
- **Fix #5, #6, #7, #8** (coming soon visibili) devono essere completati prima di qualsiasi demo — nei primi 90 secondi un investitore o un developer esperto li nota.
- **Fix #13** (metriche landing non verificabili) è il rischio reputazionale più alto: se i numeri non sono reali, vanno rimossi prima di ogni contesto YC/investor.

---

## Principi guida

**La regola che risolve tutto:** ogni dato è output di un terminale. Ogni azione è un comando. Ogni cambio di stato è un processo che si completa.

In pratica:
- Dati (chiavi, valori, nomi, email, slug) → `FONTS.mono` (`JetBrains Mono`), sempre
- Label, descrizioni, testi discorsivi → `FONTS.display` (`DM Sans`)
- Verde (`T.termGreen`) → solo per successo e stati attivi; mai per nomi di ruolo
- Amber (`T.amber`) → solo per "valore rivelato" e "valore in scadenza"
- Rosso (`T.red`) → solo per stati distruttivi ed errori
- Border: 1px, `T.border` a riposo, `T.borderHover` on hover, `T.termGreen` on focus
- Border radius: 4–6px massimo; niente che sembri una consumer app

**Il test:** un senior engineer che usa il prodotto per 6 mesi lo trova più veloce, calmo e affidabile del primo giorno? Se sì, si spedisce. Se no, si taglia.

---

## Analisi per schermata

### Dashboard
**Cosa funziona:** il breadcrumb `// dashboard` in verde è l'istinto giusto. La lista recent projects ha densità ragionevole. Il pannello quick actions mostra il modello mentale corretto.

**Cosa non funziona:**
- Le 4 stat card mostrano `—` per ENVIRONMENTS e API CALLS/DAY. Una dash implica dati rotti, non dati assenti. Psicologicamente, dashboard KPI con trattini segnalano "il prodotto non funziona ancora". Usare `0` in stile muted, oppure empty state azionabile: `no environments yet → create one`.
- Gerarchia delle stat card sbagliata: il label (`PROJECTS`) ha lo stesso peso visivo del numero (`5`). Nel design system il numero è 26px DM Sans 600, il label è 10px mono uppercase. Quello spedito sembra 14px label / 28px numero a pesi simili — l'occhio atterra su `PROJECTS` prima che su `5`.
- I dot/glifi nella sidebar (●, ▷, ≡, ◇) sono a circa 8–10px con opacity ~0.4. A queste dimensioni e contrasto sono rumore decorativo, non affordance funzionali. O si va a 14px con opacity 0.9 trattandoli come un linguaggio visivo reale, oppure si rimuovono.
- Il link "view all →" in fondo a recent projects usa `→` stilizzato identicamente al testo circostante. Non sembra interattivo. Serve underline o color shift a riposo, non solo su hover.

**Direzione fix stat card:** bordo sinistro 4px in `T.termGreen` per stat con dati, `T.border` per stat a zero. Numero 32px, label 9px mono. Stato zero: `0` in `T.textMuted` con sub-label `—`.

### Apps / Projects
**Cosa funziona:** split panel (tree sinistra, dettaglio destra) è la scelta architettonica corretta. `depth 0`, `own: 2 / inherited: 0 / overrides: 0` nel pannello dettaglio è eccellente information design per uno strumento developer. L'highlight della riga attiva (bordo verde sinistro + background shift) è il pattern corretto — è l'unica schermata dove l'estetica terminal sembra guadagnata.

**Cosa non funziona:**
- Le icone dei tree node usano tre forme (■ grande, ■ piccola, ◆, ◇) per comunicare profondità gerarchica, ma la distinzione tra ■ grande e ■ piccola è invisibile a 12px. Gli utenti si affidano solo all'indentazione, le icone aggiungono rumore zero.
- Le linee guida di indentazione (connector lines) mancano. Il design system mostra linee verticali + orizzontali che rendono le relazioni padre-figlio ovvie a colpo d'occhio. Senza connettori, l'albero sembra una lista piatta indentata, non una gerarchia. Cruciale: il modello di inheritance è la value proposition core del prodotto e visivamente è invisibile.
- Il bottone `+ new app` top-right è stilizzato identicamente ai bottoni secondari. Per la CTA primaria su una schermata semi-vuota, deve avere precedenza visiva — variante primary (white fill on hover) con prefisso `+`.

**Direzione fix tree:** aggiungere connector lines tra i nodi (1px border `T.border`). Sizing icone per profondità: root = 14px ■, depth 1 = 12px ◈, depth 2+ = 10px ◇. Riga attiva: `background: T.overlay`, `border-left: 2px solid T.termGreen`, padding-left ridotto di 2px per compensare.

### Parameters
**Cosa funziona:** split a due pannelli è forte. Il prefisso `/` nella search bar è un riferimento terminal che funziona perfettamente. La colonna `INHERITED FROM` è unica per mull ed è un vero differenziatore. Il mascheramento dei valori secret con puntini è corretto.

**Cosa non funziona:**
- L'environment selector (`alpha` dropdown) è in alto a destra, separato dalla tabella che controlla. L'occhio legge la tabella da sinistra a destra, ma il filtro che determina cosa si vede è nell'angolo opposto. Viola il principio Gestalt di prossimità: i controlli devono essere adiacenti al contenuto che affettano.
- La riga `KEY_SECRET` che mostra `(empty)` in amber è ambigua: amber significa "warning" (il secret non ha valore e dovrebbe averlo) o è solo stile informativo? Il design system stabilisce amber per "valore rivelato" — usarlo per empty state crea una collisione semantica. L'empty deve essere `T.textMuted` + italic, non amber.
- Il badge `5` nell'header del pannello APPS tree è in `T.termGreen` pieno — un badge verde per un conteggio non comunica la cosa giusta. I badge contatore devono usare `T.textSecondary`.

### Environments
**Problema critico:** il pulsante `×` in alto a destra di ogni card ambiente è un'**azione distruttiva senza conferma**, stilizzata come pulsante di chiusura, visibile a riposo. Questo è uno dei pattern UX più pericolosi nel software in produzione. Un click accidentale e un ambiente è perso. Il `×` sembra anche "chiudi questa card dalla vista" (come una notifica) piuttosto che "elimina definitivamente questo ambiente".

**Regola per azioni distruttive:** sempre dietro hover, sempre dietro una confirmation dialog, mai stilizzate come close/dismiss button.

**Altre problematiche:**
- La card grid degli ambienti ha densità informativa molto bassa. Ogni card mostra solo nome + badge opzionale. Per uno strumento developer, gli ambienti dovrebbero mostrare: parameter count, last modified, chi ha modificato, sync status. Attualmente gli ambienti sono trattati come label, non come oggetti.

**Direzione fix:** rimuovere `×` dallo stato riposo. On hover: `⋯` button (kebab) → dropdown con "rename / delete". Delete richiede conferma: `type the environment name to confirm deletion`. Aggiungere alle card: `14 parameters · updated 2h ago · by simone`.

### Profile
**Cosa non funziona:**
- "Managed via Supabase Auth" è un leak di dettagli implementativi. Gli utenti non sanno cosa è Supabase. Usare "Managed by your login provider" o "Password reset via email."
- Il badge USER in verde brillante nel profile hero è semanticamente sbagliato — USER non è uno stato (il verde implica attivo/successo), è un ruolo. I ruoli devono usare la variante default/neutral. Il verde è riservato agli stati "active" only.
- Gli input del form sembrano usare system font. Ogni input che accetta un valore tecnico (display name, username) dovrebbe usare `FONTS.mono` per rinforzare il mental model CLI.

### Settings / Org (Members)
**Cosa funziona:** la barra di utilizzo posti (`2/25 members` con progress bar) è eccellente — mostra le informazioni giuste alla densità giusta. La navigazione a tab (members / tokens / billing / audit / settings) è pulita.

**Problema critico:** "Pending Invites / Invite system coming soon" è spedito in una section header visibile. Questo è il segnale più negativo dell'intero prodotto in un contesto demo: una sezione che promette una feature e poi dice che non c'è ancora. Rimuovere completamente finché non è implementata.

### Landing Page — Hero
**Identity consistency: 8/10 — la schermata più forte di tutto il prodotto.**

**Cosa funziona:** la gerarchia tipografica è corretta — "Secrets management" in bianco bold, "for teams that ship." in grigio muted, crea una lettura in due tempi che funziona psicologicamente. Il terminal mockup sotto è il pattern giusto: mostra il prodotto invece di descriverlo. I due bottoni hanno differenziazione chiara: "start for free →" è primario (bordo bianco pieno), "› view docs" è terminal-style (verde, bordo verde). **È l'unico posto nell'intera app dove la gerarchia dei bottoni è implementata correttamente** — usare questo come riferimento per tutti gli altri contesti.

**Cosa non funziona:**
- Il badge `● OPEN BETA` è verde solid con sfondo verde. È l'unico elemento che grida "template Tailwind UI" su tutta la pagina — nel senso negativo. Per un security tool, il filled green è troppo festoso. Fix: outline badge, bordo verde, testo verde, background trasparente.
- `"for teams that ship."` ha contrasto insufficiente: il grigio usato (~`#4a4a4a` stimato su `#0a0a0a`) è circa 2.5:1 — fallisce WCAG AA. L'effetto dimmed funziona come scelta estetica ma non supera la soglia. Fix: usare `#636e84` (lo stesso aggiustamento del token `textMuted`) — mantiene l'effetto ma passa il contrasto.
- Il terminal mockup è statico. Il design system include già il componente `TermBlock` con typewriter e cursor blink (`packages/ui/src/components/TermBlock.jsx` o simile). La landing è il posto più visibile del prodotto e il terminal non si muove — è come un video in pausa come hero. Anche solo una singola riga che si scrive on page load (con `IntersectionObserver`) cambia completamente l'impatto.

### Landing Page — Features Section

**Cosa funziona:** il copy tecnico è buono. "Every secret encrypted with a unique DEK, wrapped by your KEK. Zero plaintext at rest." — questo è il livello di precisione che i developer tool buyer vogliono. Il separatore `→` in "OWNER → ADMIN → USER hierarchy" è un riferimento terminal involontario che funziona: tenerlo.

**Cosa non funziona:**
- Le sei feature card usano sei icone diverse per lo stesso livello gerarchico: ◆, ■, ◇, ▷, ⊙, ≡. Non c'è logica semantica in questa assegnazione — sembrano scelte casuali. In un design system con un linguaggio geometrico deliberato (◈ per gruppi, ◇ per foglie, ▣ per root), icone casuali sulle feature card rompono completamente il sistema. **La regola:** tutte le feature card usano la stessa icona base, differenziata solo da colore, oppure un set coerente dove ogni forma ha un significato (◈ per operazioni sui dati, ▷ per azioni/CLI, ≡ per log/audit). Non mescolare senza criterio.
- Il layout 3×2 con card tutte uguali non comunica priorità. "Envelope encryption" e "Audit log" non hanno lo stesso peso commerciale — la prima è differenziazione tecnica, la seconda è una feature standard. Il layout non aiuta il buyer a capire cosa rende mull diverso. Doppler e Infisical hanno lo stesso problema: è un'opportunità per essere migliori.

### Landing Page — Stats e CTA

**Stats bar (`1.2M secrets managed`, `99.9% uptime`, `210ms p99`, `480+ teams`):**

Se questi numeri sono reali e verificabili, ottimo — tenerli. Se non lo sono, questo è il red flag più grande possibile in un contesto YC: i VC hanno sensibilità sviluppata per vanity metrics inventate su prodotti early-stage open beta. Se i numeri non sono sostenibili al 100%, **rimuoverli**. Sostituire con indicatori onesti: "built in public", "open beta", "join the waitlist". La credibilità tecnica del copy è il vero asset della landing — non vale la pena rischiarlo su metriche non verificabili.

**CTA Section "Ready to ship securely?":**

Il copy "Free plan includes 3 apps, unlimited environments, and full CLI access" nel momento di conversione più importante della pagina parla di limitazioni del free tier. Fix: beneficio-centrico: "Start in 2 minutes. No credit card." oppure "Your first app is free, forever."

Il footer (`© 2026 Mull. All rights reserved.`) è quasi invisibile e senza link. Aggiungere almeno: docs, pricing, privacy policy, status page.

### Parameter Detail Page

**Identity consistency: 5/10**

**Cosa funziona:** la struttura concettuale è corretta — un parametro, i suoi valori per ogni environment, la history in basso. Il modello mentale è giusto.

**Cosa non funziona:**

**Layout troppo sprecato:** ogni environment occupa ~120px per mostrare nome (badge), `·······` (7 puntini), e due bottoni show/edit. Su un monitor 1080p si vedono 4 environments e si scrolla per la history. Con un layout tabellare si vedrebbero 12+ environments senza scroll, con più informazioni (last updated, chi ha modificato, versione). Il motivo per cui è stato scelto il layout a card è probabilmente estetico — sembrano più "premium". Ma per un developer tool, **la density della tabella è il premium**. Linear, Vercel, Railway usano tutti tabelle dense per i dati operativi.

**Environment badge tutti identici (blue):** `ALPHA` = blu, `BETA` = blu, `PROD` = blu, `SECRET-ENV` = blu. Tutti identici. Gli environment badge devono avere colori semantici: `prod` = amber (attenzione, è production), `staging` / `beta` = blue, `dev` / `alpha` = default/grigio. Questo è uno standard de facto nei developer tools — Doppler, Vercel, Railway lo fanno tutti. Il colore comunica il rischio dell'ambiente e **riduce errori** (modificare prod pensando di essere su dev).

**Reveal senza micro-friction:** il bottone "show" non comunica cosa succederà dopo il click — il valore si mostra in-place? Si apre un modal? Si copia in clipboard? L'assenza di feedback anticipato crea ansia. Per un security tool, il reveal di un segreto deve avere micro-friction deliberata: hover state che mostra `click to reveal · logged to audit` prima del click. Questo non è solo UX — è il messaggio che stai vendendo: accountability e audit trail. Il momento del reveal è il momento di ricordarlo.

**URL con UUID raw:** `localhost:5173/dashboard/parameters/019dff2c-3845-7074-b229-e0ee40fb3b6a?appId=...` — in produzione, un developer che condivide la URL di un parametro con un collega vede 100+ caratteri incomprensibili. Le URL fanno parte dell'UX. Target: `/dashboard/acme-corp/backend/KEY` (org slug, app slug, parameter key). Impatta condivisione, bookmarking, debugging. **Priorità alta.**

### New Parameter Modal

**Identity consistency: 7/10 — la schermata più pulita e coerente con il design system.**

**Cosa funziona:** il focus ring verde sull'input KEY è corretto. Il titolo `new parameter · acme-api` in mono lowercase con contesto dell'app è ottimo. Il toggle "secret parameter" è nel posto giusto. Il placeholder `DATABASE_URL` in uppercase nella KEY e `Primary database connection string` in sentence case nella DESCRIPTION — la coerenza è corretta.

**Cosa non funziona:**

**Toggle copy ambiguo (problema di sicurezza):** il copy sotto il toggle dice "value visible in list view" — questo è ambiguo. Se il toggle è OFF significa che il valore è secret o no? Per una UI che controlla la masking di un segreto, l'ambiguità è una vulnerabilità. Fix: label binario e non ambiguo:
- Toggle ON → `mask value (secret)` con sub-label `values shown as ••••••`  
- Toggle OFF → `show value in list`

**Nessun campo default value:** creare un parametro richiede poi di andare nella detail page per aggiungere i valori uno per uno, environment per environment. Il modal potrebbe offrire un campo "default value" opzionale che si applica a tutti gli environment come punto di partenza. Questo riduce il numero di step nel core workflow.

**Gerarchia bottoni assente:** il bottone "create" è identico a "cancel" per peso visivo. Fix: cancel = ghost/outline, create = filled white (variante `primary`). La gerarchia deve essere ovvia a colpo d'occhio.

---

## Semantica badge (regola unica)

| Stato | Variante | Colore | Quando |
|-------|----------|--------|--------|
| Attivo / Successo | `success` | `T.termGreen` | processi completati, stati live |
| Warning / Rivelato | `warning` | `T.amber` | valori secret mostrati, scadenze |
| Errore / Distruttivo | `danger` | `T.red` | errori, azioni irreversibili |
| Info | `info` | `T.blue` | informazioni neutre |
| **Ruolo utente** | **`default`** | **`T.textSecondary`** | **USER, ADMIN, OWNER, VIEWER** |
| Contatore | `default` | `T.textSecondary` | badge numerici nei panel header |

Regola: verde solo dove il sistema parla. I nomi di ruolo non sono stati — non li coloriamo.

---

## Fase 1 — Quick wins (prima di qualsiasi demo)

| # | Stato | Problema | File | Fix |
|---|-------|----------|------|-----|
| 1 | ✅ | Body font default è Inter invece di DM Sans — l'identità visiva collassa | `frontend/app/src/index.css` | Rimosso `@import` Inter; `body { font-family: 'DM Sans', ... }` |
| 2 | ✅ | Stat cards ENVIRONMENTS e API CALLS mostrano `—` — sembrano broken | `frontend/app/src/pages/Dashboard.jsx` | `value={0}` + prop `empty` su `<Stat>`; sub-label "nothing yet" |
| 3 | ✅ | Delete button `×` sempre visibile, senza handler, senza conferma | `frontend/app/src/pages/Environments.jsx` | `TrashButton` + `DeleteConfirmModal` riusabili; refactor anche in Projects.jsx |
| 4 | ✅ | USER role badge usa `success` (verde) — USER non è uno stato attivo | `frontend/app/src/pages/OrgSettingsPage.jsx` | `USER: 'success'` → `USER: 'default'` |
| 5 | ⏭ | Sezione "Pending Invites — coming soon" visibile | `frontend/app/src/pages/OrgSettingsPage.jsx` | Da implementare, poi nascondere il placeholder |
| 6 | ⏭ | Sezione "Audit Log — coming soon" visibile | `frontend/app/src/pages/OrgSettingsPage.jsx` | Da implementare, poi nascondere il placeholder |
| 7 | ⏭ | `/dashboard/users` mostra "Users — coming soon" | `frontend/app/src/App.jsx` | Da implementare |
| 8 | ⏭ | `/settings/security` e `/settings/tokens` mostrano "coming soon" | `frontend/app/src/App.jsx` | Da implementare |
| 9 | ✅ | `T.textMuted` (`#3d4555`) produce **2.1:1** — fail WCAG AA globale | `packages/ui/src/tokens.js` | `#3d4555` → `#636e84`; effetto globale |
| 10 | ✅ | Nessun focus ring globale per navigazione da tastiera | `frontend/app/src/index.css` | Aggiunta regola `:focus-visible` globale |
| 11 | ✅ | Badge `● OPEN BETA` sulla landing è verde solid — sembra un template Tailwind | `frontend/marketing/src/` | Aggiunta variante `outline` al Badge; background trasparente, bordo + testo verde |
| 12 | ✅ | `"for teams that ship."` sulla landing ha contrasto ~2.5:1 — fail WCAG AA | `frontend/marketing/src/` | Risolto da #9: usa `T.textMuted` che ora è `#636e84` |
| 13 | ⏭ | Metriche landing non verificabili (`1.2M`, `480+ teams`, `99.9%`) su open beta | `frontend/marketing/src/` | Decidere i numeri reali prima di agire |
| 14 | ✅ | Toggle copy nel modal parametro ambiguo — sicurezza critica | `frontend/app/src/pages/Parameters.jsx` | Toggle ON = `mask value (secret)` + sub `shown as ••••••`; toggle OFF = `show value in list` |
| 15 | ✅ | Environment badge tutti identici (blue) in Parameter Detail | `frontend/app/src/pages/ParameterDetail.jsx` | secret env → `warning` (amber), tutti gli altri → `default` |
| 16 | ✅ | Bottoni "create" e "cancel" nel modal parametro hanno lo stesso peso visivo | modal new parameter | Già corretto: `cancel` = `secondary`, `create` = `primary` |

---

## Fase 2 — Problemi strutturali (settimane 2–3)

### 17 ✅ — Environment selector in Parameters fuori posto
**File:** `frontend/app/src/pages/Parameters.jsx` righe 309–334

Il layout attuale usa `justifyContent: 'space-between'` con search a sinistra e `<EnvDropdown>` a destra. Spostare `<EnvDropdown>` sopra la tabella, left-aligned con la colonna KEY. Il filtro deve essere adiacente al contenuto che controlla (Gestalt proximity).

### 18 ✅ — AppTreeA manca di ARIA roles
**File:** `packages/ui/src/components/AppTreeA.jsx`

Aggiungere:
- `role="tree"` sul container esterno
- `role="treeitem"` su ogni nodo
- `aria-expanded={open}` sui nodi espandibili
- `aria-selected={selected}` sul nodo attivo
- Navigazione con frecce (up/down per traversare, left/right per collapse/expand) via `onKeyDown`

Senza questo, gli screen reader leggono l'albero come una lista piatta. L'albero di inheritance è la feature core del prodotto — deve essere accessibile.

### 19 ✅ — `aria-live` mancante su tabella Parameters
**File:** `frontend/app/src/pages/Parameters.jsx`

Quando l'utente cambia environment via dropdown, i valori in tabella si aggiornano silenziosamente — uno screen reader non lo sa. Aggiungere `aria-live="polite"` sul container della tabella dei valori. Il browser annuncerà automaticamente il cambio di contenuto senza interrompere la lettura in corso.

```jsx
<div aria-live="polite" aria-label="parameter values">
  {/* tabella parametri */}
</div>
```

Questo è il gap più sottovalutato dell'intera analisi: una riga di markup che risolve l'invisibilità dei cambiamenti dinamici per chi usa screen reader.

### 20 ✅ — Icon-only buttons senza accessible label
**File:** `frontend/app/src/components/layout/Header.jsx`

Tutti i bottoni con solo icona (profile, theme toggle, logout) devono avere `aria-label="..."`.

### 21 ✅ — Contrasto NavItem inactive sotto WCAG AA
**File:** `packages/ui/src/components/NavItem.jsx`

Dopo il fix del token `textMuted` (item 9 in Fase 1), verificare che il contrasto risultante sia sufficiente. Se `T.textSecondary` è ancora sotto 4.5:1, alzare ulteriormente il valore.

### 22 ✅ — `(empty)` in Parameters usa amber
**File:** `frontend/app/src/pages/Parameters.jsx`

**Nota importante sul contrasto:** il valore `(empty)` in amber tecnicamente **passa** WCAG AA (contrasto misurato: 8.1:1) — non è un problema di leggibilità. È un problema di **semantica del colore**: amber nel design system significa "valore rivelato", non "valore assente". Un utente con deficit nella percezione del colore amber/giallo non distingue tra un secret rivelato e un parametro vuoto.

Fix: `color: T.textMuted`, `fontStyle: 'italic'`, rimuovere background amber. Il cambio è semantico, non di contrasto.

### 23 ✅ — Breadcrumb `// section` non uniforme
**File:** tutti i file page

Standard da applicare ovunque: `// section · subsection` in `FONTS.mono`, `fontSize: 11px`, `color: T.termGreen`. Verificare che ogni page abbia il suo breadcrumb con questo formato. Le pagine che non ce l'hanno lo aggiungono.

### 24 ✅ — URL routing con UUID raw — zero slug leggibili
**File:** backend routes + `frontend/app/src/App.jsx` + pagine con link

L'URL corrente di un parametro è del tipo `/dashboard/parameters/019dff2c-3845-7074-...?appId=019dff2b-...`. In produzione un developer che condivide la URL con un collega vede 100+ caratteri inutili. Target: `/dashboard/{org-slug}/{app-slug}/parameters/{PARAM_KEY}`.

Richiede:
1. Aggiungere campo `slug` ai model `Organization`, `App` nel backend (Prisma + migrazione)
2. Route backend che accettano slug oltre a UUID
3. React Router routes aggiornate nel frontend
4. Link generati ovunque usino slug invece di UUID

Impatto: condivisione URL, bookmarking, debugging, credibilità professionale. Alta complessità, alta priorità.

### 25 ✅ — Reveal button senza micro-friction (accountability)
**File:** `frontend/app/src/pages/ParameterDetail.jsx`

Il bottone "show" per rivelare un secret non comunica che l'azione sarà loggata. Per un security tool, il reveal è il momento di ricordare il valore dell'audit trail. Aggiungere hover state con tooltip: `click to reveal · this action is logged`. La tooltip appare su hover prima del click — micro-friction deliberata che rinforza il messaggio di accountability venduto dal prodotto.

### 26 ✅  — Parameter Detail: layout a card → layout tabellare
**File:** `frontend/app/src/pages/ParameterDetail.jsx`

Ogni environment card occupa ~120px per mostrare: nome, `·······`, due bottoni. Su 1080p: 4 environment visibili, poi scroll. Un layout tabellare (colonne: env name, value masked/revealed, last updated, edited by, actions) mostrerebbe 12+ environment senza scroll, con più informazioni. Per un developer tool, la density della tabella *è* il premium — Linear, Vercel, Railway lo confermano.

Schema colonne suggerito:

| ENVIRONMENT | VALUE | LAST UPDATED | BY | |
|---|---|---|---|---|
| scret-env (amber) | •••••• | 2h ago | simone | show · edit |
| staging (grey) | •••••• | 1d ago | marco | show · edit |
| dev (grey) | postgres://... | 3d ago | simone | edit |

### 27 ✅ — Animazione typewriter sul terminal hero della landing
**File:** `frontend/marketing/src/` — componente hero

Il terminal mockup è statico. Il design system ha già `TermBlock` con typewriter e cursor blink. Anche solo una singola riga che si scrive on page load (con `IntersectionObserver` per attivarsi quando entra nel viewport) cambia completamente l'impatto. Il terminal in pausa non comunica niente; il terminal che scrive comunica "questo strumento fa cose".

### 28 ✅ — Feature card landing: coerenza icone
**File:** `frontend/marketing/src/` — sezione features

Le sei card usano sei icone diverse (◆, ■, ◇, ▷, ⊙, ≡) senza logica semantica. Fix: adottare un set coerente dove ogni forma ha significato fisso nel design system mull:
- ◈ → operazioni sui dati (encryption, secrets)
- ▷ → azioni/CLI (access, deploy)
- ≡ → log/audit/governance

Oppure: usare la stessa icona (◈) per tutte le card, differenziando solo per colore. Nessuna delle due opzioni è sbagliata — l'importante è che ci sia una regola.

---

## Fase 3 — Features (mese 2)

### 29 ✅ — Cmd+K Command Palette
Modal che occupa 60% del viewport in larghezza, overlay scuro dietro, input con prefisso `❯`, ricerca fuzzy tra: apps, parameters, environments, azioni ("new parameter", "invite user"). Ogni azione raggiungibile via UI deve essere raggiungibile anche qui. È la feature a più alto impatto per utenti terminal-native.

### 30 ✅ — Keyboard Navigation Contract (implementato, da verificare)
Un developer tool che richiede interazione col mouse per i flussi primari non è un developer tool. Contratto minimo:

| Tasto | Azione |
|-------|--------|
| `Cmd+K` | Apri command palette |
| `J` / `K` | Naviga tra gli item della lista (vim-style) |
| `Enter` | Apri item selezionato |
| `E` | Modifica item selezionato |
| `N` | Nuovo item nel contesto corrente |
| `/` | Focus search nel pannello corrente |
| `Esc` | Chiudi modal / deseleziona |
| Arrow keys | Naviga i nodi dell'albero |
| `Space` | Espandi/collassa nodo dell'albero |
| `?` | Apri modal shortcuts (tabella mono, tutti gli shortcut) |

### 31 ✅ — Empty States
Niente dash. Niente nulla. Ogni schermata con dati assenti mostra un testo centrato stile terminal:

- **Parameter table senza app selezionata:** `❯ select an app from the tree to view parameters` + cursore lampeggiante dopo il testo
- **Apps screen senza app create:** `❯ no apps yet` / `create your first app to start organizing config inheritance` / bottone `+ new app` direttamente nell'empty state
- **Environments con 0 parametri:** mostrare `0 parameters` in `T.textMuted` su ogni card — gli utenti devono sapere che lo zero è intenzionale, non broken

### 32 ✅ — Microinterazioni

**Reveal secret:** quando l'utente clicca "view" per rivelare un secret mascherato, i puntini animano out carattere per carattere (20ms/carattere, sinistra a destra). Durata ~400ms per un valore da 20 caratteri. La reveal sembra deliberata e leggermente ominosa — rinforza che si sta facendo qualcosa con conseguenze.

**Tree expand/collapse:** transizione `height` di 150ms ease-out sul container figli. Il toggle `+`/`−` ruota di 90° (CSS transform) invece di swappare il glifo. Più fluido, nessun layout reflow.

**Parameter save:** toast 2s in basso a destra con pattern terminal success — bordo sinistro verde, `✓ parameter saved`, sub-label con il key name. Auto-dismiss con progress bar che si svuota in 2s. (Componente `Toast` già presente in `packages/ui/src/components/Toast.jsx` — usare quello.)

**Environment switch in Parameters:** quando si cambia ambiente via dropdown, le celle value fanno un flash breve (80ms opacity 0 → 100%) per segnalare che i dati sono cambiati. Senza questo gli utenti non notano che i valori si sono aggiornati.

### 33 — Onboarding Checklist
Progressive disclosure che usa deliberatamente l'estetica terminal:

```
❯ welcome to mull
  setting up your workspace...
  
  ✓ organization created
  ✓ default environments added (dev, staging, prod)
  → create your first app
```

Modal checklist che appare una volta sola e avanza automaticamente al completamento degli step. Item completati mostrano `✓` in `T.termGreen`, step corrente mostra cursore lampeggiante. Insegna il modello mentale (org → app → parameters → environments) nella stessa sequenza del data model.

### 34 ✅ — Loading States
Il peggior cosa che un prodotto terminal-inspired può mostrare è uno spinner generico. Invece:

- **Page load:** mostrare il chrome della pagina (topbar, sidebar) immediatamente, poi riempire le aree contenuto con una shimmer bar alta 1px che pulsa a 1.4s — identica all'animazione pulse già nel badge system
- **Fetch parametri dopo env switch:** skeleton rows nella tabella — 3 righe, colonna key: shimmer block 60px, colonna value: shimmer block 16px
- **Mai spinner full-page** per qualsiasi cosa che carica in meno di 1 secondo

### 35 ✅ — Default value nel modal New Parameter
**File:** modal new parameter in `frontend/app/src/pages/Parameters.jsx` o componente dedicato

Il workflow attuale: crea parametro → vai alla detail page → aggiungi valori environment per environment. Il modal potrebbe offrire un campo opzionale "default value" che si applica come punto di partenza a tutti gli environment. Riduce il numero di step nel core workflow. Il campo è opzionale — non blocca la creazione se omesso.

### 36 ✅ — Footer landing con link utili
**File:** `frontend/marketing/src/` — footer component

Il footer attuale è quasi invisibile e senza link. Aggiungere: docs, pricing, privacy policy, status page, GitHub (se repo è pubblica). È la firma del prodotto — una firma vuota non ispira fiducia.

### 37 ✅ — CTA copy beneficio-centrico
**File:** `frontend/marketing/src/` — sezione CTA

"Free plan includes 3 apps, unlimited environments, and full CLI access" nel momento di conversione più importante parla di limitazioni. Sostituire con copy beneficio-centrico: `Start in 2 minutes. No credit card.` oppure `Your first app is free, forever.` Il free tier può essere descritto nella pricing page, non nel CTA principale.

---

## Note tecniche per chi implementa

### Font
JetBrains Mono e DM Sans **sono già caricati** via `<link>` in `frontend/app/index.html` (righe 7–9). Il problema è che `frontend/app/src/index.css` importa Inter via `@import url('https://fonts.googleapis.com/...')` e lo imposta come font del `body`. Basta rimuovere l'import e settare `body { font-family: 'DM Sans', 'Outfit', sans-serif; }`. Le occorrenze di `FONTS.mono` e `FONTS.display` nei componenti funzioneranno già correttamente.

### Stat component
`packages/ui/src/components/Stat.jsx` — renderizza il prop `value` direttamente, nessuna logica empty state. Il fix è nel chiamante: `frontend/app/src/pages/Dashboard.jsx` righe 55–56. Considerare di aggiungere una prop `emptyLabel` a `<Stat>` per mostrare un sub-label quando `value === 0`.

### Delete environment
Il bottone `×` in `frontend/app/src/pages/Environments.jsx` (righe 87–93) **non ha `onClick`** — è inerte. Implementare delete + hover reveal + confirm dialog è tutto da zero. Il pattern confirm richiede un input dove l'utente digita il nome dell'ambiente; confrontare con il nome reale prima di permettere l'azione.

### AppTreeA connector lines
`packages/ui/src/components/AppTreeA.jsx` righe 96–106 ha già `borderLeft: 1px solid T.border` per le connector lines verticali. Mancano i connettori orizzontali (linee che si diramano dai nodi figli). Valutare se aggiungere un pseudo-elemento `::before` con `borderTop` o usare un approccio a `background-image` con SVG inline.

### ROLE_VARIANT
`frontend/app/src/pages/OrgSettingsPage.jsx` riga 60: one-liner. Cambiare `USER: 'success'` → `USER: 'default'`. Verificare che non ci siano altri usi di `ROLE_VARIANT` o badge di ruolo in altri file.

### ProfilePage
`frontend/app/src/pages/ProfilePage.jsx` — il testo "Managed via Supabase Auth" va cambiato in "Managed by your login provider". Il badge USER/OWNER nel profile hero va portato a variante `default` (come sopra).

---

## Accessibilità — Analisi misurata

### Il problema strutturale

**Non è estetico, è strutturale.** Tutta la palette dark usa `T.textMuted` (`#3d4555`) per label, nav items inattivi e intestazioni di colonna. Su `T.bg` (`#08090c`) questo colore produce **2.1:1** di contrasto. WCAG AA richiede 4.5:1 per testo normale. Non è un difetto di gusto: è invisibile per chi ha difficoltà visive moderate, o per chi usa il prodotto con luce ambientale forte.

### I 3 fix che risolvono l'80% dei problemi

**Fix 1 — Token `textMuted`** (un token, effetto globale)
```js
// packages/ui/src/tokens.js — dark theme
textMuted: '#636e84',   // era '#3d4555' → 2.1:1; ora → ≥ 4.5:1 su #08090c
```
Questo aggiusta in un colpo: label delle colonne, nav items inattivi, sub-label delle stat card, placeholder, tutto il testo "dimmed" del prodotto. Il colore rimane percettivamente "attenuato" ma supera WCAG AA.

**Fix 2 — `:focus-visible` globale** (una regola CSS, zero tocchi ai componenti)
```css
/* frontend/app/src/index.css */
*:focus-visible {
  outline: 2px solid #22c55e;   /* T.termGreen */
  outline-offset: 2px;
  border-radius: 3px;
}
*:focus:not(:focus-visible) {
  outline: none;   /* nasconde il ring per interazioni mouse */
}
```
Elimina tutti i problemi di focus ring senza toccare l'aspetto visivo per gli utenti mouse. La pseudo-classe `:focus-visible` si attiva solo con tastiera o navigazione assistiva.

**Fix 3 — ARIA markup su AppTreeA** (vedi §18 in Fase 2)
`role="tree"`, `role="treeitem"`, `aria-expanded`. Senza questo uno screen reader non può navigare la gerarchia delle app — che è il cuore del prodotto.

### Tabella completa dei blockers WCAG AA

| # | Issue | Contrasto misurato | Target | File | Fix |
|---|-------|-------------------|--------|------|-----|
| A1 | `T.textMuted` (`#3d4555`) su `T.bg` (`#08090c`) — label, nav inactive, intestazioni colonna | **2.1:1** | 4.5:1 | `packages/ui/src/tokens.js` | `textMuted` → `#636e84` |
| A2 | Focus ring assente su input, bottoni, link | n/a | visibile | `frontend/app/src/index.css` | Regola `:focus-visible` globale |
| A3 | AppTreeA senza `role="tree"`, `aria-expanded`, navigazione tastiera | n/a | conforme | `packages/ui/src/components/AppTreeA.jsx` | ARIA roles + `onKeyDown` |
| A4 | Tabella Parameters aggiorna silenziosamente al cambio env | n/a | annunciato | `frontend/app/src/pages/Parameters.jsx` | `aria-live="polite"` sul container |
| A5 | Bottoni `×` su env card: distruttivi, senza label, senza conferma | n/a | conforme | `frontend/app/src/pages/Environments.jsx` | `aria-label` + confirm dialog |
| A6 | Icon-only buttons in Header senza label | n/a | conforme | `frontend/app/src/components/layout/Header.jsx` | `aria-label` su ogni bottone |

### Cosa NON è un problema di contrasto (ma di semantica)

Il valore `(empty)` mostrato in amber nelle righe di Parameters **passa WCAG AA** (contrasto misurato: 8.1:1) — è leggibile. Il problema è semantico: amber nel design system significa "secret rivelato", non "valore assente". Un utente con deficit nella percezione del giallo/amber non distingue le due condizioni. Fix: `color: T.textMuted`, `font-style: italic` — non amber.

---

## Come verificare

```bash
# dev server
npm run dev:app    # http://localhost:5173

# accessibility
# Chrome: installa "axe DevTools" → Run analysis su ogni schermata
# Mac VoiceOver: Cmd+F5, poi navigare con Tab / frecce
# Lighthouse: DevTools → Lighthouse → tab Accessibility

# contrasto colori (valori reali da tokens.js)
# https://webaim.org/resources/contrastchecker/
#   #636e84 su #08090c → verificare ≥ 4.5:1   (fix textMuted)
#   T.textSecondary su T.bg                    → verificare ≥ 4.5:1
# i valori hex esatti sono in packages/ui/src/tokens.js
```
