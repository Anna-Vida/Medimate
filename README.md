<div align="center">

# MediMate

**AI-assisted prescription scanning and medication support for mobile**

[GitHub Repository](https://github.com/Anna-Vida/Medimate)

![Expo](https://img.shields.io/badge/Expo-54-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react&logoColor=111827)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Auth_%2B_Firestore-FFCA28?logo=firebase&logoColor=111827)
![Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-8E75B2?logo=googlegemini&logoColor=white)
![ML Kit](https://img.shields.io/badge/ML_Kit-Text_Recognition-4285F4?logo=google&logoColor=white)

</div>

---

## Overview

**MediMate** is a React Native healthcare companion built to help users understand prescriptions, organize medication information, manage reminders, and access practical support when connectivity is limited.

The app combines camera-based prescription and medicine scanning, Google Gemini-assisted text interpretation, on-device ML Kit OCR, offline medication reference data, medication schedules, inventory tracking, drug-interaction checks, emergency tools, pharmacy search, Firebase authentication, and a healthcare support chatbot.

A major design goal is **graceful offline behavior**. When internet access or the AI service is unavailable, MediMate can fall back to local OCR, bundled medicine data, basic interaction rules, and local storage instead of silently fabricating results.

> **Important:** MediMate is an educational and portfolio healthcare application. It is not a medical device and does not replace a doctor, pharmacist, emergency service, or other qualified healthcare professional.

---

## What This Project Demonstrates

- Cross-platform mobile development with Expo and React Native
- TypeScript application architecture
- Camera-based prescription and medication scanning
- AI-assisted extraction of structured medicine information
- On-device OCR with ML Kit
- Offline-first fallback design
- Firebase Authentication and Firestore integration
- User-scoped local persistence with AsyncStorage
- Medication schedules and reminder workflows
- Inventory and medication-history management
- Drug-interaction analysis with offline fallback rules
- Location-aware emergency and pharmacy features
- SMS, notifications, speech, and speech-recognition integrations
- Firebase Functions as an AI proxy
- EAS build configuration for mobile distribution

---

## Prescription & Medicine Scanner

MediMate uses the device camera to scan medicine packaging and prescription images.

When online, the scanner can use **Gemini 2.5 Flash** to extract structured information including:

- Medicine name
- Active ingredient
- Common uses
- Dosage
- Plain-language instructions
- Warnings
- Food and drink precautions
- Recommended medication time
- Prescribing doctor information when visible
- Hospital or clinic information when visible
- Patient information when visible
- Generic alternatives and affordability-related information

The scanner supports separate **medicine/pill** and **prescription** analysis modes. Prescription mode gives additional attention to handwritten instructions and common prescription abbreviations so complex wording can be presented more simply.

---

## Offline OCR

When internet-based image analysis is unavailable, MediMate can use **React Native ML Kit Text Recognition** on the device.

~~~text
Prescription / medicine image
        ↓
On-device text recognition
        ↓
Extract recognizable prescription text
        ↓
Match medicine name against local dataset
        ↓
Return locally available medicine information
~~~

The offline path can also attempt to identify visible patient, doctor, hospital/clinic, and license-number text.

Offline results are intentionally limited and should still be confirmed with a pharmacist or qualified healthcare professional.

---

## AI + Offline Fallback Architecture

~~~mermaid
flowchart TD
    A[Camera / Prescription Image] --> B{Internet available?}
    B -->|Yes| C{AI proxy configured?}
    C -->|Yes| D[Firebase Functions AI Proxy]
    D --> E[Gemini 2.5 Flash]
    C -->|No| F[Direct Gemini development fallback]
    F --> E
    B -->|No| G[ML Kit Text Recognition]
    G --> H[Offline Medicine Dataset]
    E --> I[Structured Medicine Analysis]
    H --> I
    I --> J[Medication Record]
    J --> K[AsyncStorage]
    J --> L[Schedule / Reminder]
    J --> M[Inventory / History]
~~~

The proxy path is the preferred production direction because the server-side Gemini key does not need to be bundled into the mobile application.

---

## Offline Mode

Offline and degraded-service behavior covers situations such as:

- No internet connection
- AI quota limits
- Invalid or expired AI credentials
- Temporary AI provider failures

Available fallbacks include:

- On-device OCR
- Local medicine-name matching
- Bundled medication reference information
- Basic drug-interaction safety rules
- Offline chatbot responses for common questions
- Local medication records
- Local reminder data

If a medicine cannot be confidently identified offline, the app reports that limitation instead of claiming a successful identification.

---

## Drug Interaction Checks

MediMate can compare medications for possible conflicts.

Online analysis can use Gemini to return a structured interaction report containing conflict state, severity, and a short explanation. If AI analysis is unavailable, the app falls back to a smaller local rule set.

The offline rules include examples involving medicines such as Warfarin, Aspirin, Ibuprofen, and Diclofenac.

This feature is supportive only. Medication combinations should be verified with a pharmacist or physician before changing treatment.

---

## Prescription Completeness Indicators

The project includes a heuristic score based on visible prescription details such as:

- Doctor signature visibility
- PRC/license-number format
- Hospital or clinic information
- Patient details
- Prescribing doctor name
- Dosage information

It can surface a score, risk category, missing-information flags, passed checks, and follow-up recommendations.

This is **not** an authoritative prescription-verification or fraud-detection system. It does not validate a professional license against an official licensing database.

---

## Medication Management

Medication records are stored locally using user-scoped AsyncStorage keys.

A record can include scan date, medicine analysis, image URI, status, start/end dates, refill date, notes, last-taken time, inventory count, and daily dose count.

Supported medication states include:

- Active
- Completed
- Discontinued

Dedicated app screens cover medication lists, medicine details, inventory, and scan history.

---

## Schedules & Reminders

Users can create and edit medication schedules containing:

- Medicine name
- Frequency
- Reminder time
- Dose
- Measurement
- Start date
- End date

Frequency options include Everyday, 2x Daily, 3x Daily, Weekly, and As Needed.

Expo Notifications is integrated for medication-reminder workflows.

---

## CareBot

MediMate includes a healthcare support chatbot that can use Gemini 2.5 Flash for online responses and a smaller local fallback when the device is offline or the AI service is unavailable.

The assistant is designed to use concise language, avoid claiming to replace a doctor, recommend professional care for emergency symptoms, and direct medication-dose changes to a doctor or pharmacist.

The project also includes speech and speech-recognition services for voice-oriented interactions and selectable response languages.

---

## Emergency Tools

The emergency module includes:

- Emergency contact storage
- Medical ID information
- Foreground location
- Location refresh
- SMS availability checks
- Emergency SMS workflows
- Triage-level selection
- Hospital contact information
- Distance estimates when coordinates are available
- Map and telephone links

The application includes Philippine emergency-oriented information and hospital references.

Emergency tools are convenience features. In a real emergency, contact the appropriate emergency service directly.

---

## Pharmacy Finder

The pharmacy finder can request foreground location and open Google Maps searches for nearby pharmacies.

It supports location-aware search, Philippines-wide fallback search when location is unavailable, phone actions, and nearest/budget-oriented UI choices.

The feature does not maintain a live pharmacy inventory database.

---

## Authentication & User Data

MediMate uses **Firebase Authentication** for account creation, login, logout, and persisted sessions.

Firestore is used to create a basic user profile containing information such as email, full name, account creation time, medication data, and emergency-contact data.

Firebase Auth remains the credential source of truth. Local medication and emergency records are also scoped to the current user so data is separated between signed-in accounts.

---

## Firebase Functions AI Proxy

The repository includes a Firebase Functions backend under **functions/**.

The HTTPS AI proxy supports text generation and chatbot requests and can accept base64 JPEG input for image analysis.

Server-side AI configuration uses:

~~~env
GEMINI_API_KEY=
~~~

The mobile client can point to the proxy through:

~~~env
EXPO_PUBLIC_AI_PROXY_URL=
~~~

This keeps the server Gemini credential out of the mobile bundle when the proxy path is used.

---

## Tech Stack

| Area | Technologies |
| --- | --- |
| **Mobile app** | React Native 0.81, React 19, Expo 54 |
| **Language** | TypeScript 5.9 |
| **Navigation** | Expo Router, React Navigation |
| **Camera** | Expo Camera |
| **OCR** | React Native ML Kit Text Recognition |
| **AI** | Google Gemini 2.5 Flash |
| **Authentication** | Firebase Authentication |
| **Cloud data** | Firebase Firestore |
| **Serverless backend** | Firebase Functions |
| **Local storage** | AsyncStorage |
| **Connectivity** | React Native NetInfo |
| **Notifications** | Expo Notifications |
| **Location** | Expo Location |
| **Emergency messaging** | Expo SMS |
| **Speech** | Expo Speech, Expo Speech Recognition |
| **UI / animation** | React Native Reanimated, Expo Linear Gradient |
| **Build / distribution** | Expo Development Client, EAS configuration |

---

## Project Structure

~~~text
Medimate/
├── app/
│   ├── (tabs)/
│   ├── auth/
│   ├── add-schedule.tsx
│   ├── chatbot.tsx
│   ├── emergency.tsx
│   ├── interaction-result.tsx
│   ├── inventory.tsx
│   ├── medications.tsx
│   ├── medicine-details.tsx
│   ├── onboarding.tsx
│   ├── pharmacy-finder.tsx
│   └── scanner.tsx
├── assets/
├── components/
├── constants/
├── functions/
│   └── src/index.ts
├── hooks/
├── services/
│   ├── aiProxy.ts
│   ├── authFacade.ts
│   ├── chatbot.ts
│   ├── firebase.ts
│   ├── gemini.ts
│   ├── medicationStorage.ts
│   ├── network.ts
│   ├── offlineFallback.ts
│   ├── offlineMedicineData.ts
│   ├── offlineOcr.ts
│   ├── speechService.ts
│   ├── translator.ts
│   ├── userProfile.ts
│   └── userScopedStorage.ts
├── app.json
├── eas.json
├── firebase.json
├── Dockerfile
└── package.json
~~~

---

## Getting Started

### Requirements

Recommended tools:

- Node.js
- npm
- Expo tooling through npx
- Android Studio for Android emulator/device builds
- Xcode for native iOS builds on macOS
- Firebase project for authentication and Firestore
- Gemini configuration for online AI features

### Clone

~~~bash
git clone https://github.com/Anna-Vida/Medimate.git
cd Medimate
~~~

The repository currently uses **feature/gemini-scanner-fixes** as its default branch.

### Install dependencies

~~~bash
npm install
~~~

### Start Expo

~~~bash
npx expo start
~~~

Because MediMate includes native modules such as ML Kit text recognition and speech recognition, a **development build** is recommended for testing the complete feature set.

Android:

~~~bash
npm run android
~~~

iOS:

~~~bash
npm run ios
~~~

Web:

~~~bash
npm run web
~~~

Some camera/OCR, SMS, speech-recognition, and notification features may behave differently or be unavailable on web.

---

## Environment Variables

The client references:

~~~env
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_AI_PROXY_URL=
EXPO_PUBLIC_GEMINI_API_KEY=
~~~

The Firebase Functions proxy uses:

~~~env
GEMINI_API_KEY=
~~~

For production-style AI access, prefer:

~~~text
Mobile app
   ↓
EXPO_PUBLIC_AI_PROXY_URL
   ↓
Firebase Functions
   ↓
GEMINI_API_KEY
   ↓
Google Gemini
~~~

Expo public environment variables are bundled into client builds and must not be treated as secrets.

---

## Firebase Functions

From **functions/**:

~~~bash
npm install
npm run build
~~~

Run with Firebase emulators:

~~~bash
npm run serve
~~~

Deploy:

~~~bash
npm run deploy
~~~

The configured Firebase project is **medimate-79755**.

---

## Useful Commands

Project root:

~~~bash
npm start
npm run android
npm run ios
npm run web
npm run lint
~~~

Functions:

~~~bash
npm run build
npm run serve
npm run deploy
~~~

---

## EAS Build Configuration

**eas.json** defines development, preview, and production profiles.

The development profile uses an Expo development client with internal distribution, while the production profile uses automatic version incrementing.

---

## Security & Production Notes

Before treating MediMate as a production healthcare application:

- Prefer the Firebase Functions AI proxy over direct client-side Gemini access.
- Never store secrets in <code>EXPO_PUBLIC_*</code> environment variables.
- The prescription-authenticity score is heuristic and does not verify licenses against an official database.
- AI-generated medication, affordability, interaction, and coverage information should be verified against authoritative sources.
- Emergency location and SMS features depend on device permissions and support.
- Offline interaction rules cover only a limited number of combinations.
- Automated test coverage and healthcare-specific validation should be expanded.
- Sensitive health information needs a dedicated privacy and security review before production use.

---

## Current Status

### Implemented

- Expo / React Native mobile application
- File-based routing
- User onboarding
- Firebase email authentication
- User profile storage
- Camera-based medication scanning
- Gemini-assisted medicine analysis
- Prescription-mode extraction
- ML Kit offline OCR
- Offline medicine-reference fallback
- Medication storage and history
- Inventory management
- Medication schedules and reminders
- Drug-interaction checks
- CareBot assistant
- Multiple-language response support
- Speech and speech-recognition integration
- Emergency contact and medical-ID tools
- Location-aware emergency features
- SMS integration
- Pharmacy finder
- Firebase Functions AI proxy
- Development / preview / production EAS profiles

### Possible Future Improvements

- Move every Gemini-dependent feature behind the server-side proxy
- Add authoritative medication and interaction data sources
- Add approved official license-verification sources
- Expand automated unit, integration, and device tests
- Strengthen backend authorization for cloud health data
- Perform privacy and encryption review for sensitive information
- Improve cross-device medication synchronization
- Add production observability and error reporting
- Complete clinical and accessibility review

---

## Author

**Anna Patricia B. Vida**

- GitHub: [Anna-Vida](https://github.com/Anna-Vida)
- LinkedIn: [annavida12](https://www.linkedin.com/in/annavida12/)

---

## Medical Disclaimer

MediMate is a portfolio and educational software project.

The application may display information produced by AI models, local rule sets, OCR, external services, or user-provided data. These outputs can be incomplete or incorrect.

Do not use MediMate as the sole basis for medication decisions, diagnosis, treatment, prescription verification, emergency triage, or changes to a prescribed dose. Always verify medication information with a licensed pharmacist or qualified healthcare professional. For urgent or life-threatening symptoms, contact emergency services immediately.
