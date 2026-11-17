# KuraliUpdates iOS app

This is the native iOS buyer app built with Expo SDK 58 / React Native 0.88. It uses the existing Spring Boot API and does not create a second backend or database.

## Requirements

- Node.js 22.13+ (or 24.3+)
- Xcode 26.4+ for SDK 58 iOS builds
- Apple Developer account for device distribution and App Store submission
- Expo account for EAS Build

## Run locally

```bash
cd apps/ios
npm install
npx expo install --fix
npm run start
```

Press `i` to open the iOS Simulator (requires macOS and Xcode), or scan the development QR code using a compatible Expo Go client.

## Build for iOS

```bash
npx eas-cli build --platform ios --profile preview
npx eas-cli build --platform ios --profile production
```

Before building, create/link the Expo project and replace `extra.eas.projectId` in `app.json` with the generated project ID. Configure Apple signing credentials in EAS. App Store Connect submission is intentionally a separate, owner-authorized release step.

## Scope in this PR

- Native iOS buyer sign-in using the existing email/phone OTP API
- Token storage in iOS Keychain through Expo SecureStore
- Buyer product catalogue search and display
- Existing buyer order history endpoint integration
- Role-specific native UI foundation and typed API boundary

The existing React/Vite web portals and their deployments remain unchanged. Web React components are not imported into React Native; shared backend contracts and API behavior are reused at the network boundary.
