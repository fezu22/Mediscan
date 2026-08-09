Yeh complete prompt hai — seedha issues.md mein paste karo, phir iske mutabiq fix karo:
Markdown# MedScan — Fix ALL issues below (do only these)

Repo context: React Native MedScan app (JS/JSX, no TypeScript).
Path alias `@/` → `src/` via babel-plugin-module-resolver.

**Gemini model rule (STRICT):** Use ONLY `gemini-3.1-flash-lite` everywhere. Do not use gemini-2.0-flash or any other model. Hardcode it; do not rely on env override for model name.

---

## CRITICAL (must fix — app crashes)

### 1) Fix `src/localization/languages.js`
Currently it only has `export default { en, ur, ar, hi, ps }` but the app imports named exports.

Rewrite `src/localization/languages.js` so it exports:

- `dictionaries` — object map of all language dicts
- `LANGUAGES` — array: `{ code, name, native }` for en, ur, ar, hi, ps
- `SUPPORTED_LANGUAGES` — list of codes
- `getDictionary(code)` — returns dict or falls back to English
- `isRTL(code)` — true for ur, ar, ps (and fa, sd if needed)
- default export = dictionaries

`src/localization/index.js` already re-exports:
`SUPPORTED_LANGUAGES, LANGUAGES, dictionaries, getDictionary, isRTL` from `./languages` — keep that working.

### 2) Add top-level `tabs` to EVERY language file
Files: `src/localization/en.js`, `ur.js`, `ar.js`, `hi.js`, `ps.js`

Each file must have top-level (not nested under history):

```js
tabs: {
  home: '...',
  history: '...',
  profile: '...',
},
English example:
JavaScripttabs: {
  home: 'Home',
  history: 'History',
  profile: 'Profile',
},
Translate for ur, ar, hi, ps.
3) Safe access in src/navigation/MainTabNavigator.jsx
Replace:

t.tabs.home → t.tabs?.home || 'Home'
t.tabs.history → t.tabs?.history || 'History'
t.tabs.profile → t.tabs?.profile || 'Profile'


HIGH
4) Fix broken logo
src/assets/images/logo.png is corrupt/tiny (~135 bytes).
Copy the real logo from assets/images/logo.png (repo root) to src/assets/images/logo.png.
5) Gemini model = ONLY gemini-3.1-flash-lite
In BOTH files, hardcode (no other model):
src/screens/Result/ResultScreen.jsx
JavaScriptconst GEMINI_MODEL = 'gemini-3.1-flash-lite';
src/components/VoiceBotModal.jsx
JavaScriptconst GEMINI_MODEL = 'gemini-3.1-flash-lite';
Remove any normalizeGeminiModelName helpers that default to other models.
All API URLs must use this model only:
https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=...
6) Add profile section to ALL language files
ProfileScreen uses these keys under t.profile — add to en/ur/ar/hi/ps:
JavaScriptprofile: {
  title: 'My',
  subtitle: 'Profile',
  signedIn: 'Signed in',
  guest: 'Guest mode',
  totalScans: 'Total Scans',
  language: 'Language',
  selectLanguage: 'Select Language',
  settings: 'Settings',
  notifications: 'Notifications',
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
  rate: 'Rate App',
  support: 'Support',
  logout: 'Log Out',
  logoutConfirm: 'Log out?',
  logoutMsg: 'You will be signed out of your account.',
  cancel: 'Cancel',
},
Translate for ur, ar, hi, ps.

MEDIUM
7) Fill empty camera tip/frame strings
In all language files, under camera, these must NOT be empty strings:

medicineTip, medicineFrame
reportTip, reportFrame
xrayTip, xrayFrame
prescriptionTip, prescriptionFrame

English examples:
JavaScriptmedicineTip: 'Keep the label straight, good light, edges clear.',
medicineFrame: 'Keep medicine pack / strip inside the frame',
reportTip: 'One page at a time. Paper flat, less shadow, readable text.',
reportFrame: 'Full report page should fit in the frame',
xrayTip: 'Film/print on a flat surface. Avoid glare, cover the full image.',
xrayFrame: 'X-ray / scan film fully inside the frame',
prescriptionTip: 'Page straight, handwriting clear. One page at a time.',
prescriptionFrame: 'Prescription page inside the frame',
Translate for ur/ar/hi/ps.
8) Create .env.example at project root
textSUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
GOOGLE_WEB_CLIENT_ID=your_google_web_client_id.apps.googleusercontent.com
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.1-flash-lite
9) RTL conflict — src/context/LanguageContext.jsx
index.js forces LTR always. Do NOT call I18nManager.allowRTL / forceRTL in LanguageContext.
Language change should only swap the dictionary strings; layout stays LTR.
Keep exporting isRTL in context value if needed, but do not force layout RTL.

ALREADY OK (do not break)
HomeScreen buttons (keep as-is)
In src/screens/Home/HomeScreen.jsx these must remain:
jsx{t.home?.medicineBtn || 'Medicine'}
{t.home?.medicineSub || 'Pack / strip'}
{t.home?.reportBtn || 'Report'}
{t.home?.reportSub || 'Lab / X-Ray'}
And matching keys must exist in every language home object:















































langmedicineBtnmedicineSubreportBtnreportSubenMedicinePack / stripReportLab / X-Rayurدوائیپیک / سٹرپرپورٹلیب / ایکس رےarدواءعبوة / شريطتقريرمعمل / أشعةhiदवापैक / स्ट्रिपरिपोर्टलैब / एक्स-रेpsدرملپیک / سټریپراپورلاب / ایکس رے

Do NOT change

Do not switch Gemini model away from gemini-3.1-flash-lite
Do not convert project to TypeScript
Do not remove medical disclaimer behavior
Do not invent dosages in prompts (ResultScreen system rules stay safe)

Done when

App starts without crash (languages.js exports work)
Bottom tabs show Home / History / Profile labels
Home logo displays
Language switch updates Home + Profile + Camera tips
All Gemini calls use only gemini-3.1-flash-lite

textIsay copy karke apne repo ki `issues.md` mein daalo, phir AI/agent se bolo: **“Fix everything in issues.