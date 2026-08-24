# HEC Alpha 0.6.33 dual-install deployment plan

No external deployment is performed by this checkpoint.

## Permanent roles

- **HEC — My Data:** deploy the repository root to the existing GitHub Pages origin and path. Never move this installation to a new origin. The root `installation-config.js` and `manifest.webmanifest` are the My Data deployment files.
- **HEC — TEST:** use the free, genuinely separate origin `https://mlwes-hec-test.github.io`. Create a separate GitHub user or organisation named `mlwes-hec-test` and its user/organisation Pages repository `mlwes-hec-test.github.io`. Do not use another project directory under the My Data hostname.

TEST uses the identical application files. Before publishing the TEST copy, overlay only:

1. `deployment/test/installation-config.js` as root `installation-config.js`;
2. `deployment/test/manifest.webmanifest` as root `manifest.webmanifest`.

The TEST configuration is hard-bound to `https://mlwes-hec-test.github.io`. At another origin it stops before runtime startup or service-worker registration.

## Historical-data-preserving first deployment

1. Open the currently installed HEC Home Screen app that holds the historical data.
2. Download a full backup from that installed app, not from an unrelated Safari tab.
3. Open the JSON file and verify that it contains `format`, `version`, `profile` and `functional` records. Keep a second safe copy.
4. Keep the existing My Data GitHub Pages origin, path and Home Screen icon in place. Do not uninstall it.
5. Deploy the shared repository root in place at the existing My Data Pages location. Do not apply the TEST overlay there.
6. Reopen the existing Home Screen installation online and confirm `HEC — My Data`, version 0.6.33 and the historical Profile, Diary, weights, activities, My Foods, My Recipes, Shopping, companion and preferences.
7. Reopen My Data offline after the successful online update.
8. Only after preservation is confirmed, create the separate `mlwes-hec-test.github.io` Pages site, copy the same shared release into it and apply the two TEST overlay files.
9. Open `https://mlwes-hec-test.github.io`, verify the yellow/black TEST identity and install it separately using Add to Home Screen.
10. Full Reset TEST repeatedly and verify My Data remains unchanged before routine dual-install testing begins.

## Future 0.6.34+ workflow

1. Build one approved source version.
2. Publish it to the TEST origin with the TEST overlay.
3. Complete founder and physical-device testing.
4. Publish the same accepted source version to the unchanged My Data origin without the TEST overlay.
5. Confirm each installation's role, version, storage namespace and service-worker cache in Founder diagnostics.

Never change storage keys as part of an ordinary version bump. Never delete/reinstall My Data until its backup and historical records have been physically verified.
