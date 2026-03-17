# ClarifyApp (MediMate)

> AI-powered medicine scanner, medication tracker, and emergency SOS app for mobile devices.

## Features

- **AI Medicine Scanner:** Instantly identify medicines by scanning packaging or prescriptions using your camera and AI.
- **Medication Tracking:** Schedule, track, and get reminders for your medications. View history and receive drug interaction alerts.
- **Emergency SOS:** One-tap SOS sends your GPS location and medical ID to emergency contacts. Voice-activated support included.
- **Offline Medicine Lookup:** Search for medicines and details even without internet access.
- **Multi-language Support:** Translate medicine info and app content for accessibility.
- **Secure Authentication:** Onboarding and login flow with persistent user sessions.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)

### Installation

```bash
npm install
```

### Running the App

```bash
npx expo start
```

Open in Expo Go, Android emulator, or iOS simulator as prompted.

### Resetting the Project

```bash
npm run reset-project
```

This moves starter code to `app-example` and creates a blank `app` directory.

## Folder Structure

- `app/` — Main app screens and navigation (file-based routing)
- `components/` — Reusable UI components
- `constants/` — Color themes and UI constants
- `services/` — API, authentication, AI proxy, and storage logic
- `hooks/` — Custom React hooks
- `assets/` — Images and static assets
- `scripts/` — Utility scripts (e.g., project reset)
- `android/` — Native Android project files
- `functions/` — (If using serverless functions)
- `utils/` — Utility helpers

## Key Technologies

- [Expo](https://expo.dev/) / React Native
- TypeScript
- AI integration (Google Gemini, AI proxy)
- Firebase (for authentication)
- Offline-first medicine database

## Permissions

The app requests permissions for:

- Camera (scanning medicines)
- Location (emergency SOS)
- Microphone (voice activation)
- Notifications (reminders)

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License

MIT

---

_Created by Anna Patricia Vida_
