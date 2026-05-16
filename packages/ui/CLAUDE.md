# @vextis/ui — Design System

## Regole assolute
- Mai colori hex hardcoded nei componenti. Sempre `T.nomeProprieta`
- FONTS.display (DM Sans) → heading, prose, testo leggibile
- FONTS.mono (JetBrains Mono) → chiavi, valori, badge, label, prompt, tutto ciò che è "dato"
- T.termGreen → solo terminal layer: prompts, badge status, cursor, focus border. Mai su titoli o CTA.
- T.textPrimary → bianco (dark) / nero (light). È il colore primario, non il verde.
- Valori segreti rivelati → sempre T.amber

## Aggiungere un componente
1. Crea file in `src/components/NomeComponente.jsx`
2. Export named (non default)
3. Prop `T` obbligatoria per il tema
4. Aggiungi export in `index.js`

## NON mettere qui
- Logica di business
- Chiamate API
- State globale dell'app
