# Alpha 0.6.33 confirmed-action conversation foundation

`conversation-foundation.js` is the reusable, persistence-free boundary for short companion conversations. It owns local-calendar intent parsing, recurrence bounds, conversation states, response classification, corrections, and save-lock identity. It does not know about Food Library DOM nodes, speech-recognition implementations, Diary storage, or Weight records.

## Boundary

- Conversation state moves through prompting, listening, transcript capture, interpretation, clarification, confirmation, saving, saved, cancelled, and recoverable-error states.
- A pending action carries the action type, transcript, local date, meal, intent/status, recurrence, entry count, confidence, unresolved fields, provenance, canonical resolved items, and a stable action/save-lock identity.
- Food resolution remains an adapter in `alpha06.js` and uses the same central `searchRank` plus `HECFoodCatalogue.rank` path as typed Food Library requests.
- `createSaveAdapter` is the confirmation gate. It rejects unresolved actions, prevents concurrent or repeated confirmation of one action identity, and optionally delegates undo.
- The Food save adapter stages the entire batch before changing the in-memory Diary, then performs one persistence call. Future dates and every recurrence entry are saved through the existing Diary model with `status: "planned"` and stable planner/voice references.

The request parser removes intent in this order: optional wake phrase, action/tense, quantity and unit, local date, daily recurrence, meal, then the remaining product phrase. Typed transcript review and speech transcripts call the same parser. Calendar dates are constructed at local noon from calendar parts; UTC `toISOString()` slicing is not used.

The first recurrence grammar is deliberately narrow: `every day ... for the next N days|weeks`. A request without an explicit start begins tomorrow, the approved two-week case creates 14 planned dates, and the hard limit is 31 entries. Above-limit requests remain unresolved and cannot reach the save adapter.

## Future Weight adapter

A later approved Weight Check-In batch can reuse the foundation without copying the conversation system:

1. Keep the existing prompt, listening, transcript, response, correction, and confirmation UI adapter.
2. Parse the shared local date and action response with `conversation-foundation.js`.
3. Attach a Weight-specific resolver that returns a pending action such as `{actionType: "weight-check-in", localDate, valueKg, confidence, unresolved, transcript, provenance, actionId}`.
4. Provide a Weight-specific summary renderer and a `createSaveAdapter({save, undo})` implementation that calls the established Weight transaction only after explicit confirmation.
5. Preserve Weight’s existing validation, same-date identity, discrepancy warnings, and post-save graph behavior inside that adapter.

This RC4 batch does not add a Weight microphone, Weight conversation room, Weight parser, or any Weight persistence/UI change. Weekly/custom-day recurrence, accounts, family sharing, cloud storage, and device synchronisation also remain outside this foundation.
