# MedScan

A React Native app that lets users scan medicines and lab reports and get
clear, simple, non-diagnostic explanations — with English + Urdu support.

**Language: plain JavaScript + JSX** (no TypeScript). Path alias `@/` →
`src/` is resolved via `babel-plugin-module-resolver` in `babel.config.js`.

## Status: Phase 1 of N

This drop contains the **full project scaffold** plus four fully built screens:

- ✅ Splash
- ✅ Language Select (English / Urdu)
- ✅ Auth Choice (Phone OTP / Google / Email — UI only, Supabase wiring next)
- ✅ Home (Scan CTA, Quick Tips, Recent Scan, disclaimer, pull-to-refresh)

Everything else (Complete Profile, Camera, AI Result, History, Profile) is
wired into navigation as lightweight placeholder screens so the app runs
end-to-end today, and will be built out screen-by-screen next.

## Getting started

```bash
npm install
cp .env.example .env   # fill in Supabase + Gemini keys

# iOS
cd ios && pod install && cd ..
npm run ios

# Android
npm run android
```

## Project structure

```
MedScan/
├── App.jsx                   # Providers + navigation root
├── babel.config.js           # incl. @/ -> src/ alias (module-resolver)
├── src/
│   ├── theme/colors.js       # Raw hex tokens for native modules/icons
│   ├── localization/         # en.js, ur.js, index.js
│   ├── context/
│   │   ├── LanguageContext.jsx   # persisted language + RTL handling
│   │   └── AuthContext.jsx       # session state (Supabase wiring next)
│   ├── components/
│   │   ├── ScreenContainer.jsx
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   ├── DisclaimerBanner.jsx
│   │   └── ComingSoon.jsx        # placeholder for unbuilt screens
│   ├── navigation/
│   │   ├── RootNavigator.jsx     # Stack: Splash → Language → Auth → Main
│   │   └── MainTabNavigator.jsx  # Tabs: Home / History / Profile
│   └── screens/
│       ├── Splash/SplashScreen.jsx
│       ├── Onboarding/LanguageSelectScreen.jsx
│       ├── Auth/AuthChoiceScreen.jsx
│       ├── Auth/CompleteProfileScreen.jsx   (placeholder)
│       ├── Home/HomeScreen.jsx
│       ├── Camera/CameraScreen.jsx          (placeholder)
│       ├── Result/ResultScreen.jsx          (placeholder)
│       ├── History/HistoryScreen.jsx        (placeholder)
│       └── Profile/ProfileScreen.jsx        (placeholder)
```

## Design system

| Token         | Hex       |
|---------------|-----------|
| Primary       | `#0E9F8E` |
| Primary Dark  | `#0B7A6D` |
| Coral         | `#FF7A59` |
| Mint          | `#E6F5F2` |
| Background    | `#F7F9F9` |
| Card          | `#FFFFFF` |
| Text Dark     | `#1F2937` |
| Text Muted    | `#6B7280` |
| Danger        | `#D64545` |

Rounded corners 16–28px, soft shadows, generous spacing. All colors live in
[src/theme/colors.js](src/theme/colors.js) for native styling and places that
need a raw hex, e.g. icon `color` props and gradients.

## Roadmap (next steps)

1. Complete Profile screen (Name, Age 15+, Phone, Country) + validation
2. Supabase Auth wiring (Phone OTP, Google, Email) — replace `AuthContext` stub
3. Camera screen: Medicine/Report toggle, `react-native-vision-camera` preview,
   shutter, image quality (blur/dark) check before upload
4. Gemini analysis service: unified prompt, category-mismatch handling,
   medicine detail + alternatives extraction, plain-language report explainer
5. Result screen: confidence badge, TTS playback, follow-up chat, share as
   image/PDF, drug-interaction warning (common pairs only)
6. History: SQLite local store + Supabase cloud sync, offline queue, search/
   filter, favorites, pull-to-refresh
7. Profile: language switch, logout, free-tier counter, "Premium coming soon"
8. Medicine reminders via local notifications (Notifee)
9. Dark mode (tokens already scaffolded in [src/theme/colors.js](src/theme/colors.js))
10. Empty/error states pass + accessibility pass

## Medical safety

Every screen that shows AI-derived content must render `<DisclaimerBanner />`.
The app never gives dosages beyond what's printed on the package/report, and
never provides a diagnosis — only plain-language explanation with a
"consult your doctor" reminder.
