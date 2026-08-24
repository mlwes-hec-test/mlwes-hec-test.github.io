# Healthy Eating Companion — Founder Trial Alpha 0.6.4

## Build outcome

Alpha 0.6.4 was built from the uploaded Alpha 0.6.3 project and incorporates the changes agreed during the family-testing review session. The build remains a self-contained static web application suitable for the existing GitHub Pages trial site.

## Data continuity

The two existing storage identifiers were deliberately retained:

- `healthyEatingCompanionAlpha06`
- `healthyEatingCompanionAlpha06Functional`

Both records are migrated to version 0.6.4 without intentionally removing the existing profile, Diary, recipes, favourites, plans, weight history or Shopping List. New backup and restore controls provide additional protection.

Continuity depends on publishing Alpha 0.6.4 at the same website address and opening it in the same browser storage context. Clearing website data, Private Browsing, changing the domain/repository path, or changing device/browser can still remove or isolate local data.

## Principal implemented changes

- Correct local Today handling using the selected active time zone.
- Optional location, home time zone and travel behaviour settings with automatic daylight-saving rules.
- Surname field and future-ready hidden profile/contact structure.
- Clearer Home weight and energy labels with the latest recorded weight date.
- Collapsed energy-calculation explanation behind a question-mark control.
- Goal-change validation repair, including Maintain-to-Lose changes.
- Back and Home controls on applicable secondary screens.
- Date-based rooms reset to Today when opened from Home.
- Categorised, tappable companion tips, quotes, jokes, facts and encouragement.
- Planned-food names and actions on Daily Progress.
- Editable fluid target with the 2,600 mL tested adult-male default.
- Food Library state protection, clearer tab names and improved Create or Scan behaviour.
- Search-based recipe ingredient builder with food-specific measures, draft retention and automatic nutrition totals.
- Meal Planner budget, nutrient display, duplicate protection and persistent Undo improvements.
- Structured feedback, optional local anonymous event counts and local Founder Trial Tools.
- Backup, restore, testing reset and complete local leave/delete workflow.

## Validation performed

### Static checks

- JavaScript syntax checks passed for `app.js`, `alpha06.js`, `alpha064.js`, `companions.js` and `config.js`.
- HTML inspection found 394 unique IDs and no duplicate IDs.
- All local script and stylesheet references exist.
- The service worker includes the new Alpha 0.6.4 cache and `alpha064.js`.

### Browser-flow checks

A headless Chromium test was run using seeded Alpha 0.6.3 profile and functional data.

Confirmed:

- Completed user opens Daily Progress.
- Version displays Alpha 0.6.4.
- Existing profile data migrates and Surname is added without deleting prior fields.
- Existing functional storage migrates to 0.6.4.
- Diary opened from Home resets to the Brisbane-local Today date.
- Diary contains both Back and Home and Back returns to Home in the tested flow.
- Favourite Foods and Foods I Created labels display correctly.
- Create or Scan opens and closes when the library tab changes.
- Recipe search finds bacon, presents food-specific measures and adds an ingredient.
- Changing Maintain Weight to Lose Weight reaches Recommendations without the stale-goal error.
- Calculation details start collapsed and open correctly.
- No JavaScript runtime errors occurred in the core flow.

### Daily Progress checks

Confirmed:

- Opening from Home resets to Today.
- A planned food appears by name.
- Mark Eaten, Change, Replace, Move and Skip are present.
- The default tested fluid target is 2,600 mL.
- A manually changed 3,000 mL target is saved.
- No runtime errors occurred.

### Feedback and founder checks

Confirmed:

- Send Feedback, Data/Backup, Founder Tools, Reset and Leave actions are present.
- A structured feedback record is prepared and stored locally.
- Founder tools unlock with a newly created six-digit local PIN.
- A trial invitation record and invite-code link can be created.
- Download Backup, Restore Backup and analytics consent controls are present.
- No runtime errors occurred.

### Responsive visual checks

Mobile-width screens were rendered for Home, Diary, Recipe Builder and Settings. The Companion Circle remained circular, recipe controls remained readable, and the Back/Home header was adjusted to a clear two-row mobile layout.

## Important static-build limitations

Founder authentication, the 10-invite limit, invitation records, analytics and collected feedback are local to the browser running the founder tools. A static GitHub Pages application cannot securely enforce these across devices or centrally aggregate information. A future protected backend with authenticated roles will be required for true founder-only access and cross-device reporting.

Feedback is saved locally and then shared, copied or emailed. It is not silently uploaded.

Barcode camera, barcode-from-photo, OCR, online food databases, sharing, email, Print/PDF and Home Screen installation still require real-device HTTPS testing.

## Recommended deployment and first test

1. Keep a copy of the Alpha 0.6.3 deployment.
2. Replace the existing GitHub Pages files with the complete Alpha 0.6.4 folder at the same path.
3. Open the existing address in Safari on each tester’s usual device.
4. Confirm the existing profile and Diary are still present.
5. Immediately use **Settings → Data, Backup & Privacy → Download Backup**.
6. Work through `TESTING_CHECKLIST_ALPHA_0_6_4.txt`.
