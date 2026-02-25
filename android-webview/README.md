# Sagarika Bill Android WebView App

This Android app opens:

- `https://sagarikabill.vercel.app/`

## Open in Android Studio

1. Open Android Studio.
2. Click **Open**.
3. Select the `android-webview` folder.
4. Wait for Gradle sync to complete.

## Run on device/emulator

1. Connect an Android phone (USB debugging on) or start an emulator.
2. Click **Run** in Android Studio.

## Build release APK

1. In Android Studio, go to **Build > Generate Signed App Bundle / APK**.
2. Choose **APK**.
3. Create/select a keystore and finish the wizard.

## Change the target website

Edit:

- `app/src/main/java/com/sagarikabill/app/MainActivity.kt`

Update this line:

- `webView.loadUrl("https://sagarikabill.vercel.app/")`
