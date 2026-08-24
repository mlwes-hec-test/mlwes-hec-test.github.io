HEALTHY EATING COMPANION — FOUNDER TRIAL ALPHA 0.6.33

RELEASE-CANDIDATE DEPLOYMENT
1. Keep a current JSON backup safe before replacing an earlier build.
2. Upload the complete Alpha 0.6.33 release candidate over Alpha 0.6.32 at the same GitHub Pages address. Do not mix runtime files from different versions.
3. Wait for publishing to finish, fully close HEC, then reopen it while online.
4. Confirm the page title or Home badge says Alpha 0.6.33.
5. Confirm the existing profile, Diary, weight history, activities, My Foods, recipes, Shopping and preferences remain present.
6. Reopen the installed app offline only after one successful online load.

WHAT IS NEW
Alpha 0.6.33 integrates the approved Stage 1–8 work: safer release/reset handling; the canonical 16-companion roster and production artwork; curated portable voice styles; onboarding, time-zone and iPad improvements; Exercise & Activity; Weight & Nutrition Progress Graphs; refined Weight Check-In, Shopping and Recent flows; stronger Australian food catalogue/search and serving handling; and founder-trial barcode and Nutrition Panel review workflows.

DUAL-INSTALL TESTING
The repository root is HEC — My Data and preserves the established historical storage namespace. HEC — TEST uses the same application source with the two small files under deployment/test overlaid at a genuinely separate HTTPS origin. Never place TEST under another path on the My Data hostname. Follow DUAL_INSTALL_DEPLOYMENT_ALPHA_0_6_33.md before any external deployment.

See RELEASE_NOTES_ALPHA_0_6_33.txt for the user-visible summary and HEC_ALPHA_0_6_33_BUILD_AND_TEST_REPORT.md for the software verification record.

DATA STORAGE
Alpha 0.6.33 deliberately retains the established Alpha 0.6 storage keys:
- healthyEatingCompanionAlpha06
- healthyEatingCompanionAlpha06Functional

IMPORTANT LIMITATIONS
This remains a static Founder Trial, not a public production health service. It does not claim a complete or continuously current Australian product database. Current package information remains the preferred authority for packaged food. Online product data can be incomplete or outdated. Nutrition Panel OCR must be reviewed and corrected by the user.

Real iPhone/iPad testing remains a release gate for camera barcode capture, OCR accuracy, speech voices, installed-PWA update behaviour, native sharing and printing. Do not declare the release candidate finally released until that physical-device checklist passes.
