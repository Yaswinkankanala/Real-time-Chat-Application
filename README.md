# 🌐 ChatSphere • Complete Real-Time Chat Application

**ChatSphere** is a premium, real-time collaboration and messaging platform built with a modern **React + Tailwind CSS** frontend, **Node.js + Express + Socket.IO** backend, secure **Firebase Google OAuth Authentication**, protected **Channels with Passcodes**, and autonomous **Nova AI** assistance.

---

## 🌟 Key Upgraded Features

### 1. Application Branding — ChatSphere
- Complete rebranding across all components, browser title, metadata, and themes.
- Custom **ChatSphere Logo**: Futuristic chat bubble merged with a glowing orbital sphere.
- Modern 3-Column Responsive Dashboard (Left Sidebar, Main Chat Stream, Collapsible Right Details Panel).
- Clean Dark / Light mode toggle.

### 2. Secure Google Authentication (Firebase & Firebase Admin SDK)
- Authentic Firebase Google OAuth with `GoogleAuthProvider` and `signInWithPopup`.
- Backend verification using Firebase Admin SDK via `POST /api/auth/verify`.
- Backend never trusts client-supplied user IDs or emails — verifies cryptographic Firebase ID tokens.
- Automatic session persistence using Firebase `onAuthStateChanged` and secure JWT.
- Removed all "Verified by Firebase" branding from UI while preserving full cryptographic token verification.

### 3. User Registration & Onboarding Profile Completion
- Triggered automatically on first-time Google sign-in.
- **Required Fields**: Full Name, Email (read-only from Google), Date of Birth, Mobile Number (with international format validation), Gender, Unique Username.
- **Optional Fields**: Profile Picture, Bio, Location, Interests tags.
- Profile Readiness progress bar (0% - 100%).
- **Privacy Protections**: Date of birth and mobile numbers are kept strictly private and are never exposed in user search APIs.

### 4. Real-Time One-to-One Messaging
- User search & discovery modal ("Find People" button).
- Live online/offline presence indicators.
- Instant WebSocket delivery via Socket.IO.
- Message delivery receipts: `sent` (✓), `delivered` (✓✓), and `read` (blue ✓✓).
- Real-time typing indicators.
- Empty state: *"No conversations yet. Find someone and start chatting!"* with a working **Find People** trigger.

### 5. Protected Channels with Passcodes
- Create public or private channels.
- **Passcode System**:
  - Automatically generates a unique secure passcode (e.g. `CS-9623`) or accepts custom passcodes.
  - Creator becomes channel owner and member automatically.
  - Passcode is securely stored and hashed on the backend.
  - Passcode display modal with one-click copy.
  - Non-members must enter the valid passcode to join private channels (`POST /api/channels/join`).
  - Strict authorization: non-members cannot read private channel message history.
  - Channel owners can regenerate the passcode anytime from the right details panel.
  - Members can leave; owners can delete.

### 6. Nova AI Assistant
- Dedicated `#ai-lounge` channel and direct conversation with Nova AI.
- Tag `@Nova` in any channel to trigger realistic AI typing indicators and responses.
- **AI-Powered Smart Replies**: Contextual 3-reply chips displayed above message input.
- **✨ AI Conversation Summary**: One-click summary with bulleted takeaways.
- Powered by Google Gemini API (`GEMINI_API_KEY`) with intelligent contextual fallback.

---

## 📂 Project Architecture

```
realtime-chat-app/
├── backend/
│   ├── data/
│   │   └── db.json               # Seed database & JSON storage
│   ├── src/
│   │   ├── aiAgent.js            # Nova AI service (Gemini + Smart Replies)
│   │   ├── auth.js               # Firebase Admin SDK & JWT middleware
│   │   ├── db.js                 # Models for Users, Channels, Conversations, Messages
│   │   ├── server.js             # Express server, Socket.IO, static uploads
│   │   ├── socket.js             # Real-time WebSocket handlers & AI triggers
│   │   └── routes/
│   │       ├── authRoutes.js     # /api/auth/verify, login, register, me
│   │       └── chatRoutes.js     # Users, Conversations, Messages, Channels, AI
│   ├── uploads/                  # Uploaded attachments and media
│   ├── .env                      # Backend environment variables
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ai/               # Nova AI drawer
    │   │   ├── auth/             # LoginModal with Google OAuth & fast-track demo
    │   │   ├── chat/             # ChatArea, MessageItem, MessageInput, RightDetailsSidebar, FindPeopleModal
    │   │   ├── common/           # ChatSphereLogo
    │   │   ├── profile/          # OnboardingModal, ProfileModal
    │   │   └── sidebar/          # Sidebar, CreateChannelModal, JoinChannelModal
    │   ├── context/
    │   │   ├── AuthContext.jsx   # Authentication state & Google OAuth
    │   │   └── SocketContext.jsx # Real-time Socket.IO stream
    │   ├── firebase/
    │   │   └── config.js         # Firebase client SDK initialization
    │   ├── services/
    │   │   └── api.js            # REST API client
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── tailwind.config.js
    ├── vite.config.js
    └── package.json
```

---

## 🛠️ Firebase Console Setup Instructions

To connect your own Google Cloud / Firebase project for production Google OAuth:

1. **Go to Firebase Console**: [https://console.firebase.google.com](https://console.firebase.google.com)
2. **Create or select a project** (e.g. `chatsphere-app`).
3. **Enable Google Authentication**:
   - Go to **Build** -> **Authentication** -> **Sign-in method**.
   - Click **Add new provider** -> select **Google** -> toggle **Enable** -> click **Save**.
4. **Configure Authorized Domains**:
   - In Authentication -> **Settings** -> **Authorized domains**, add:
     - `localhost`
     - `127.0.0.1`
5. **Get Frontend Web App Credentials**:
   - Go to **Project Settings** (gear icon) -> **General** -> scroll down to **Your apps**.
   - Click **Add app** (Web `</>`), register app as `ChatSphere Web`.
   - Copy the configuration keys into `frontend/.env`:
     ```ini
     VITE_FIREBASE_API_KEY=AIzaSy...
     VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
     VITE_FIREBASE_PROJECT_ID=your-app
     VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
     VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
     VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
     ```
6. **(Optional) Backend Firebase Admin SDK**:
   - Go to **Project Settings** -> **Service accounts**.
   - Click **Generate new private key** and download the JSON.
   - Set in `backend/.env`:
     ```ini
     FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
     ```

---

## 🚀 Starting the Servers

```powershell
# 1. Start Backend (Port 5000)
cd backend
node src/server.js

# 2. Start Frontend (Port 5173)
cd frontend
npm.cmd run dev
```
