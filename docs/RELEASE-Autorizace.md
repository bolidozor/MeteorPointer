# Test release from the `Autorizace` branch (Android)

Branch-tagged build for trying the API integration on a real phone.

- **versionName:** `1.0-Autorizace` (distinct from standard `1.0` releases)
- **versionCode:** `2`
- Signed with the debug key (fine for sideloading; not for the Play Store).
- Cleartext HTTP is permitted (see `network_security_config.xml`) so the app can
  reach a local API over `http://` on the LAN. Production uses HTTPS via a proxy.

## Prerequisites

- Node + [bun](https://bun.sh), JDK 17
- Android SDK with `ANDROID_HOME` (or `android/local.properties` → `sdk.dir=...`)
- Phone with **USB debugging** on (Settings → Developer options), or allow
  "install unknown apps" to sideload the APK file.

## 1. Build the APK

```sh
bun install
cd android
# Windows:
./gradlew.bat assembleRelease
# macOS/Linux:
./gradlew assembleRelease
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

## 2. Install on the phone

**Over USB (adb):**
```sh
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

**Or** copy `app-release.apk` to the phone (USB / cloud / e-mail) and open it;
confirm "install from unknown source".

> Quick alternative for a USB-connected phone: `bun android` builds and installs
> a **debug** build directly (also branch-tagged via versionName).

## 3. Point the app at your API

1. On the PC, find its LAN IP (`ipconfig` → IPv4, e.g. `192.168.1.50`).
2. In the app: **Home → Síť (Network) → API server URL** = `http://192.168.1.50:8000`
3. Tap **Load consent → I agree and connect** → the device registers and shows a
   one-time recovery phrase.
4. Run a measurement; it uploads automatically (or via the **Sync** button).

The API side (Docker) must:
- publish port 8000 on the host (it does),
- accept the LAN host — set `DJANGO_ALLOWED_HOSTS` to include the PC IP (or `*`
  for testing),
- be reachable through the PC firewall (allow inbound TCP 8000).

## Verify a measurement reached the API

```sh
# in the webAPI repo, on the running stack:
docker compose exec db psql -U meteorpointer -d meteorpointer \
  -c "select client_key, status, received_at from ingest_rawingest order by received_at desc limit 5;"
```
