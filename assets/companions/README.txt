HEC Alpha 0.6.33 Stage 3A companion artwork

The approved production artwork is separate from companion identity and saved user data. The audited 1800 x 1800 RGBA masters, reviewed 512 x 512 RGBA picker PNGs, audit report, manifest and contact sheet are external authoring assets. They must not be copied into the deployable application tree.

Only the optimised WebP files under runtime/ belong in the shipped static application.

runtime/picker/ contains transparent 320 x 360 WebP assets for the 16-card companion picker. All 16 are available offline after installation.

runtime/hero/512/ and runtime/hero/1024/ contain transparent 4:5 WebP hero assets for picker detail and Home. They are requested responsively and cached on first use rather than all being downloaded during installation.

The runtime files are deterministic, aspect-preserving, uncropped derivatives of the audited PNGs. They must only be regenerated from the approved audited source pack. Supply that pack deliberately from an external location:

python scripts/build_companion_assets.py <external-path-to-approved-audited-zip>

The build script validates the external pack and writes only optimised files under runtime/. It does not install the authoring PNGs or audit/reference files into the application.

Do not redraw, regenerate, auto-trace, recolour or substitute this artwork. companion-artwork.js is the runtime path manifest. companions.js remains the companion identity source.
