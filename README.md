# دور القرآن — Awqaf Dar

A mobile app for managing Quran centers in Kuwait: student registration, levels (تمهيدي / مطور), classes and weekly schedule, attendance, grades, transfers and reports.

| Folder | What it is |
|---|---|
| `backend/` | REST API — Node.js, Express, TypeScript, MongoDB (Mongoose) |
| `mobile/` | Mobile app — Expo (React Native), Expo Router, TypeScript |

## Requirements

- [Node.js](https://nodejs.org) 20 or newer, and Git
- A MongoDB database — a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster works
- The **Expo Go** app on your phone (App Store / Google Play), or an iOS/Android emulator

## 1. Clone

```bash
git clone https://github.com/rawan95rsh-blip/awqaf-dar.git
cd awqaf-dar
```

## 2. Run the backend

```bash
cd backend
npm install
cp .env.example .env
```

Open `backend/.env` and set at least:

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/awqaf-dar
JWT_SECRET=any-long-random-string
NODE_ENV=development
```

Then start the server:

```bash
npm run dev
```

The API runs on `http://localhost:8000` — check it at `http://localhost:8000/api/health`.

**Optional — demo data (local only):**

```bash
npm run seed
```

This creates a demo center you can log in with: phone `+965 50000001`, password `123456`.

## 3. Run the mobile app

Open a second terminal:

```bash
cd mobile
npm install
```

Create a file `mobile/.env` that points the app to your backend:

```env
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_IP:8000
```

> Use your computer's local network IP (e.g. `192.168.1.20`), **not** `localhost`, when testing on a real phone — the phone and computer must be on the same Wi-Fi.
> iOS simulator: `http://localhost:8000` · Android emulator: `http://10.0.2.2:8000`

Start the app:

```bash
npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iPhone).

> The app is Arabic right-to-left. On the very first launch in Expo Go, if the layout appears left-to-right, close and reopen the app once.

## Useful commands

| Where | Command | What it does |
|---|---|---|
| backend | `npm run dev` | Start the API with auto-reload |
| backend | `npm run build` / `npm start` | Build and run for production |
| backend | `npm run seed` | Add demo data (refuses to run in production) |
| backend | `npm run purge-demo` | Preview fake/demo students — add `-- --confirm` to delete them |
| backend | `npm test` | Integration tests (needs `TEST_MONGODB_URI`) |
| backend | `npm run typecheck` | TypeScript check |
| mobile | `npx expo start` | Start the app |
| mobile | `npx tsc --noEmit` | TypeScript check |

## More docs

- `CHANGES.md` — what changed in the production update (Arabic)
- `mobile/docs/DESIGN_SYSTEM.md` — design system and how to build new screens
- `mobile/docs/DEPLOY.md` — deployment notes

> Never commit `.env` files. They are already in `.gitignore`.
