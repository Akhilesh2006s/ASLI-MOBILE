# Assets Setup Guide

## Required Assets

For production builds, you'll need to create the following assets:

### App Icon
- **Location**: `assets/icon.png`
- **Size**: 1024x1024 pixels
- **Format**: PNG with transparency
- **Usage**: App icon displayed on home screen

### Splash Screen
- **Location**: `assets/splash.png` (optional - currently using solid color)
- **Size**: 1242x2436 pixels (or use a solid color)
- **Format**: PNG
- **Usage**: Shown when app is launching

### Android Adaptive Icon
- **Location**: `assets/adaptive-icon.png` (optional - currently using solid color)
- **Size**: 1024x1024 pixels
- **Format**: PNG
- **Usage**: Android adaptive icon

## Quick Setup

You can use the existing logo from the client folder:

1. Copy `client/public/logo.jpg` to `expo-go/assets/icon.png`
2. Resize to 1024x1024 if needed
3. For splash screen, you can use a solid color (currently set to blue #2563eb)

## Generate Assets with Expo

Alternatively, use Expo's asset generation:

```bash
npx expo install expo-asset
```

Or use an online tool like:
- https://www.appicon.co/
- https://makeappicon.com/

## Current Configuration

The app is currently configured to work without assets (using solid colors). This is fine for development with Expo Go. For production builds, you'll want to add proper assets.


