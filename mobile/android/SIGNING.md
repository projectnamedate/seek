# Seek Android Release Signing

## Why a new keystore

The Solana dApp Store **rejects debug-signed APKs and rejects APKs signed with
your Google Play Store key** (per docs.solanamobile.com/dapp-publishing/prepare).
You need a NEW keystore dedicated to this app.

Losing this keystore = you can never update Seek on the dApp Store. Back it up
in at least two places.

## Generate the keystore

```bash
cd mobile/android
keytool -genkeypair -v \
  -keystore seek-release.keystore \
  -alias seek \
  -keyalg RSA \
  -keysize 2048 \
  -validity 36500   # 100 years
```

You'll be prompted for:
- Keystore password  → save in 1Password as `SEEK_KEYSTORE_PASSWORD`
- Distinguished name  → your name / org / country
- Key password        → can be same as keystore password

## Back up

1. `1Password` team vault: upload `seek-release.keystore` + both passphrases
2. Offline copy: encrypted USB, in a safe, physically separate from laptop
3. Paper backup: print the base64 of the keystore (`base64 seek-release.keystore | qrencode -o seek-keystore-qr.png`)

Never commit the keystore to git. `.gitignore` already has `*.keystore` under `android/app/`, but double-check before committing.

## Build a signed release APK

```bash
export SEEK_KEYSTORE_PATH="$PWD/seek-release.keystore"
export SEEK_KEYSTORE_PASSWORD="<from 1password>"
export SEEK_KEY_ALIAS=seek
export SEEK_KEY_PASSWORD="<from 1password>"

cd mobile/android
./gradlew clean
./gradlew assembleRelease
# => app/build/outputs/apk/release/app-release.apk
```

The build script at `mobile/android/app/build.gradle` automatically uses the
release signing config when `SEEK_KEYSTORE_PATH` is set. Without the env vars,
it falls back to debug signing so local developers can still build.

## Verify the signature

```bash
keytool -printcert -jarfile app/build/outputs/apk/release/app-release.apk
# Should show the certificate you just generated (NOT "Android Debug").

# Sanity check: APK is aligned + properly signed with v2+v3 schemes
jarsigner -verify -verbose app/build/outputs/apk/release/app-release.apk
apksigner verify --verbose --print-certs app/build/outputs/apk/release/app-release.apk
```

## Version bumps

Every dApp Store release needs a monotonically-increasing `versionCode`:

```groovy
// mobile/android/app/build.gradle
defaultConfig {
    versionCode 2        // was 1
    versionName "1.0.1"  // user-visible
}
```

`versionName` is free-form (SemVer recommended); `versionCode` is strictly monotonic.

## Keystore loss recovery

If the keystore is lost: you cannot update Seek on the dApp Store under the
same publisher NFT / app NFT. You'd have to create a NEW app listing from
scratch with a new package name (e.g. `app.seek.mobile.v2`). Users on the old
listing would not get updates.

**Back it up.**
