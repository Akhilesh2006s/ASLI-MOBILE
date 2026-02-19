# AsliLearn Mobile App - Deployment Guide

## Prerequisites
- ✅ EAS CLI installed (`eas-cli/16.28.0`)
- ✅ Logged into EAS (`akhileshsamayamanthula@gmail.com`)
- ✅ Expo SDK 54 configured

## Deployment Options

### Option 1: Development Build (For Testing)
Build a development build that can be installed on physical devices:

```bash
# For Android APK (can install directly)
eas build --profile development --platform android

# For iOS (requires Apple Developer account)
eas build --profile development --platform ios
```

### Option 2: Preview Build (Internal Testing)
Build a preview version for internal testing:

```bash
# Android APK
eas build --profile preview --platform android

# iOS
eas build --profile preview --platform ios
```

### Option 3: Production Build (App Store/Play Store)
Build production-ready apps for stores:

```bash
# Android AAB (for Google Play Store)
eas build --profile production --platform android

# iOS IPA (for App Store)
eas build --profile production --platform ios
```

## Step-by-Step Deployment

### 1. Configure EAS Project (First Time Only)
```bash
cd "F:\Asli learn\expo-go"
eas build:configure
```
This will create/update the `eas.json` file and link your project to EAS.

### 2. Build for Android (Recommended First)
```bash
# For testing - creates APK you can install directly
eas build --profile preview --platform android
```

The build will:
- Upload your code to EAS servers
- Build the app in the cloud
- Provide a download link when complete

### 3. Install on Device
After the build completes:
- **Android**: Download the APK from the provided link and install on your device
- **iOS**: Install via TestFlight or direct link

### 4. Submit to Stores (Production)

#### Google Play Store:
```bash
eas build --profile production --platform android
eas submit --platform android
```

#### Apple App Store:
```bash
eas build --profile production --platform ios
eas submit --platform ios
```

## Build Profiles Explained

- **development**: For development/testing with Expo Go features
- **preview**: Internal testing builds (APK/IPA)
- **production**: Store-ready builds (AAB/IPA)

## Important Notes

1. **First Build**: The first build may take 15-30 minutes
2. **Subsequent Builds**: Usually faster (5-10 minutes) due to caching
3. **iOS Requirements**: 
   - Apple Developer account ($99/year)
   - Xcode setup (for local builds)
4. **Android Requirements**:
   - Google Play Developer account ($25 one-time)
   - No special setup needed

## Quick Start (Recommended)

For immediate testing on Android:

```bash
cd "F:\Asli learn\expo-go"
eas build --profile preview --platform android
```

Wait for the build to complete, then download and install the APK on your Android device.

## Environment Variables

If you need to set environment variables for builds:

```bash
eas secret:create --scope project --name API_URL --value "https://api.aslilearn.ai"
```

## Monitoring Builds

Check build status:
```bash
eas build:list
```

View specific build:
```bash
eas build:view [build-id]
```

## Troubleshooting

### Build Fails
1. Check logs: `eas build:view [build-id]`
2. Verify `app.json` configuration
3. Ensure all dependencies are in `package.json`

### App Crashes on Device
1. Check device logs
2. Verify API endpoints are accessible
3. Test with development build first

## Next Steps

1. Run `eas build:configure` to set up the project
2. Build a preview version: `eas build --profile preview --platform android`
3. Test on your device
4. Once satisfied, build production version
5. Submit to app stores






