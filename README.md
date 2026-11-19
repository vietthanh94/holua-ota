# holua-ota

Signed web-app update packs for the Hổ Lửa Phước Lộc kiosk app.
Each pack is `manifest.json` + `manifest.sig` (ECDSA P-256) + the files it lists; the app checks the signature
and every file's SHA-256 before using anything. `test/` is the test channel. Do not edit by hand: use `tools/ota-publish.sh`.
