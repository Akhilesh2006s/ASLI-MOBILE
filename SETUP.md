# Expo Go Setup Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   cd expo-go
   npm install
   ```

2. **Install Expo CLI globally** (if not already installed)
   ```bash
   npm install -g expo-cli
   ```

3. **Start the Development Server**
   ```bash
   npm start
   ```

4. **Run on Your Device**
   - Install **Expo Go** app from App Store (iOS) or Play Store (Android)
   - Scan the QR code that appears in your terminal
   - The app will load on your device

## Environment Setup

Create a `.env` file in the `expo-go` directory:

```env
EXPO_PUBLIC_API_URL=https://api.aslilearn.ai
```

For local development:
```env
EXPO_PUBLIC_API_URL=http://localhost:5000
```

## Project Structure

```
expo-go/
├── app/              # All screens (Expo Router)
│   ├── index.tsx     # Homepage
│   ├── auth/         # Login & Register
│   ├── dashboard.tsx # Student dashboard
│   └── ...
├── src/
│   └── lib/          # Utilities & API config
└── assets/           # Images, fonts (create this folder)
```

## Available Screens

- `/` - Homepage
- `/auth/login` - Login page
- `/auth/register` - Registration page
- `/dashboard` - Student dashboard
- `/learning-paths` - List of learning paths
- `/subject/[id]` - Subject content
- `/quiz/[id]` - Quiz/Test page
- `/ai-tutor` - AI chat interface
- `/practice-tests` - List of practice tests

## Troubleshooting

### Issue: "Module not found"
**Solution**: Run `npm install` again

### Issue: "Cannot connect to API"
**Solution**: 
1. Check your `.env` file
2. Ensure backend server is running
3. For localhost on physical device, use your computer's IP address instead of `localhost`

### Issue: "Expo Go app not loading"
**Solution**:
1. Ensure device and computer are on same WiFi network
2. Try restarting Expo server: `npm start -- --clear`
3. Check firewall settings

### Issue: "Image not loading"
**Solution**: 
- Images should be in `assets/` folder
- Use `require()` for local images
- For remote images, use full URLs

## Building for Production

### Using EAS Build (Recommended)

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Login:
   ```bash
   eas login
   ```

3. Configure:
   ```bash
   eas build:configure
   ```

4. Build:
   ```bash
   eas build --platform android
   eas build --platform ios
   ```

## Development Tips

1. **Hot Reload**: Changes automatically reload in Expo Go
2. **Debugging**: Shake device to open developer menu
3. **Logs**: Check terminal for console logs
4. **Reload**: Press `r` in terminal to reload app

## Next Steps

1. Add more screens as needed
2. Customize styling
3. Add animations
4. Implement offline support
5. Add push notifications

## Need Help?

- Expo Docs: https://docs.expo.dev
- React Native Docs: https://reactnative.dev
- Expo Go App: https://expo.dev/client

