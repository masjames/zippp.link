# Zippp Android companion

## Build

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
./gradlew :app:assembleDebug
```

Debug APKs:

- `app/build/outputs/apk/play/debug/app-play-debug.apk`
- `app/build/outputs/apk/sideload/debug/app-sideload-debug.apk`

The `play` flavor has no GitHub APK install path and no
`REQUEST_INSTALL_PACKAGES`. The `sideload` flavor declares that permission.

## Strings

Do not edit `app/src/main/res/values/strings.xml` by hand. Run:

```bash
npm run android:strings
```

It regenerates the Android resources from `spec/wording.txt`.

## Release signing

Copy `keystore.properties.example` to `keystore.properties`, fill it, and keep
both the file and the keystore out of git. `versionCode` and `versionName` can be
set with `ZIPPP_VERSION_CODE` and `ZIPPP_VERSION_NAME`. `ZIPPP_API_BASE_URL`
overrides the API host for a staging build.
