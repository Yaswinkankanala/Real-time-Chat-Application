# 🌐 ChatSphere • Complete Real-Time Chat Application

**ChatSphere** is a premium, real-time collaboration and messaging platform built with a modern **React + Tailwind CSS** frontend, **Node.js + Express + Socket.IO** backend, secure **Firebase Authentication (Google OAuth + Email/Password)**, protected **Channels with Passcodes**, and autonomous **Nova AI** assistance.

---

## 🌟 Key Features

### 1. Secure Firebase Authentication (Google OAuth & Email/Password)
- Authentic Firebase Google OAuth with `GoogleAuthProvider` and `signInWithPopup`.
- Authentic Firebase Email & Password Registration and Sign-In with real-time verification and password reset.
- Cryptographic backend verification using Firebase Admin SDK and claim verification via `POST /api/auth/verify`.
- Automatic session persistence using Firebase `onAuthStateChanged` and secure JWT.
- In-app Firebase credentials settings modal with live connection badge and seamless fallback for local test profiles.

### 2. Application Branding & Modern UI
- Custom **ChatSphere Logo**: Futuristic chat bubble merged with a glowing orbital sphere.
- Modern 3-Column Responsive Dashboard (Left Sidebar, Main Chat Stream, Collapsible Right Details Panel).
- Clean Dark / Light mode toggle.

### 3. User Registration & Onboarding Profile Completion
- Triggered automatically on first-time sign-in.
- **Required Fields**: Full Name, Email, Date of Birth, Mobile Number, Gender, Unique Username.
- **Optional Fields**: Profile Picture, Bio, Location, Interests tags.
- Profile Readiness progress bar (0% - 100%).
- **Privacy Protections**: Date of birth and mobile numbers are kept strictly private.

### 4. Real-Time One-to-One Messaging
- User search & discovery modal ("Find People" button).
- Live online/offline presence indicators.
- Instant WebSocket delivery via Socket.IO.
- Message delivery receipts: `sent` (✓), `delivered` (✓✓), and `read` (blue ✓✓).
- Real-time typing indicators.

### 5. Protected Channels with Passcodes
- Create public or private channels.
- **Passcode System**:
  - Automatically generates unique secure passcode (e.g. `CS-9623`) or accepts custom passcodes.
  - Creator becomes channel owner and member automatically.
  - Passcode is securely stored and hashed with bcrypt on the backend.
  - Non-members must enter valid passcode to join private channels (`POST /api/channels/join`).
  - Strict authorization: non-members cannot read private channel message history.
  - Channel owners can regenerate the passcode anytime from the right details panel.

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
│   │   └── db.json               # Pure JS storage & persistent database
│   ├── src/
│   │   ├── aiAgent.js            # Nova AI service (Gemini + Smart Replies)
│   │   ├── auth.js               # Firebase Admin SDK & JWT middleware
│   │   ├── db.js                 # Models for Users, Channels, Conversations, Messages
│   │   ├── server.js             # Express server, Socket.IO, static uploads & frontend serving
│   │   ├── socket.js             # Real-time WebSocket handlers & AI triggers
│   │   └── routes/
│   │       ├── authRoutes.js     # /api/auth/verify, login, register, me, firebase-config
│   │       └── chatRoutes.js     # Users, Conversations, Messages, Channels, AI
│   ├── uploads/                  # Uploaded attachments and media
│   ├── .env.example              # Backend environment variables
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ai/               # Nova AI drawer
│   │   │   ├── auth/             # LoginModal with Firebase Google + Email/Password
│   │   │   ├── chat/             # ChatArea, MessageItem, MessageInput, RightDetailsSidebar, FindPeopleModal
│   │   │   ├── common/           # ChatSphereLogo
│   │   │   ├── profile/          # OnboardingModal, ProfileModal
│   │   │   └── sidebar/          # Sidebar, CreateChannelModal, JoinChannelModal
│   │   ├── context/
│   │   │   ├── AuthContext.jsx   # Authentication state & Firebase auth
│   │   │   └── SocketContext.jsx # Real-time Socket.IO stream
│   │   ├── firebase/
│   │   │   └── config.js         # Firebase client SDK initialization & auth helpers
│   │   ├── services/
│   │   │   └── api.js            # REST API client
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   ├── vercel.json
│   ├── .env.example
│   └── package.json
├── Dockerfile                    # Multi-stage production container
├── .dockerignore
├── render.yaml                   # 1-Click Render Blueprint configuration
├── railway.json                  # Railway deployment configuration
├── Procfile                      # Heroku / PaaS process file
├── package.json                  # Root monorepo build & start scripts
└── README.md
```

---

## 🛠️ Step-by-Step Firebase Authentication Setup

To link your live Firebase Project for production authentication:

### 1. Create a Firebase Project
1. Navigate to the **[Firebase Console](https://console.firebase.google.com/)**.
2. Click **Add project** (e.g. `chatsphere-app`) and follow the on-screen steps.

### 2. Enable Authentication Providers
1. In your Firebase Project sidebar, go to **Build** &gt; **Authentication**.
2. Click **Get Started** (if opening for the first time).
3. Under the **Sign-in method** tab:
   - **Google**: Click Google &gt; Toggle **Enable** &gt; Choose project support email &gt; Click **Save**.
   - **Email/Password**: Click Email/Password &gt; Toggle **Enable** &gt; Click **Save**.

### 3. Add Authorized Domains
1. In **Authentication** &gt; **Settings** tab &gt; **Authorized domains**.
2. Click **Add domain** and add your production domain:
   - For local development: `localhost` and `127.0.0.1` (usually present by default).
   - For Render: `<your-service-name>.onrender.com`
   - For Railway: `<your-app-name>.up.railway.app`
   - For Vercel: `<your-app-name>.vercel.app`
   - Any custom domain (e.g. `chat.yourdomain.com`).

### 4. Create Web App Credentials
1. Go to **Project Settings** (gear icon ⚙️ in the top left) &gt; **General** tab.
2. Scroll down to **Your apps** and click the Web icon `</>`.
3. Register app nickname (e.g. `ChatSphere Web`).
4. Copy the keys from the displayed `firebaseConfig`:
   ```ini
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=chatsphere-app.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=chatsphere-app
   VITE_FIREBASE_STORAGE_BUCKET=chatsphere-app.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
   VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef123456
   ```

### 5. Backend Firebase Admin SDK Setup (Optional but Recommended)
1. In Firebase Console &gt; **Project Settings** &gt; **Service accounts** tab.
2. Click **Generate new private key** and download the `.json` file.
3. For deployment platforms (Render, Railway, etc.), copy the JSON content and set it as an environment variable:
   ```ini
   FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"..."}
   ```
   *Or set just `FIREBASE_PROJECT_ID=chatsphere-app` for zero-configuration token claim verification!*

---

## 🚀 Deployment Options

### Option 1: 1-Click Deploy on Render (Recommended)

The repository includes a ready-to-use `render.yaml` Blueprint that deploys the entire full-stack app (Backend + Frontend + WebSockets) in a single service:

1. Push your repository to your GitHub account.
2. Log in to **[Render](https://render.com/)**.
3. Click **New +** &gt; **Blueprint**.
4. Connect your `Real-time-Chat-Application` repository.
5. Render will automatically detect `render.yaml` and prompt you for the Firebase environment variables:
   - `FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `FIREBASE_SERVICE_ACCOUNT_JSON` *(Optional)*
   - `GEMINI_API_KEY` *(Optional)*
6. Click **Apply**. Render will build and deploy your app.
7. Once deployed, copy your Render URL (e.g., `https://chatsphere.onrender.com`) and add it to **Authorized Domains** in Firebase Console!

---

### Option 2: Deploy on Railway

1. Log in to **[Railway](https://railway.app/)**.
2. Click **New Project** &gt; **Deploy from GitHub repo**.
3. Select this repository.
4. Go to **Variables** and add the Firebase environment variables (listed above).
5. Railway will automatically build via Nixpacks and start `npm start`.
6. Go to **Settings** &gt; **Generate Domain** to get your public URL.
7. Add the generated domain to **Authorized Domains** in Firebase Console!

---

### Option 3: Deploy with Docker (Cloud Run, Fly.io, VPS)

A high-performance multi-stage `Dockerfile` is included:

```bash
# Build the Docker image
docker build -t chatsphere .

# Run the container with your Firebase keys
docker run -p 5000:5000 \
  -e FIREBASE_PROJECT_ID="your-project-id" \
  -e VITE_FIREBASE_API_KEY="AIzaSy..." \
  -e VITE_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com" \
  -e VITE_FIREBASE_PROJECT_ID="your-project-id" \
  -e VITE_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com" \
  -e VITE_FIREBASE_MESSAGING_SENDER_ID="1234567890" \
  -e VITE_FIREBASE_APP_ID="1:1234567890:web:abcdef" \
  chatsphere
```

---

### Option 4: Separate Deployment (Backend on Render/Railway, Frontend on Vercel)

If you prefer hosting the React frontend on **Vercel** and the Node backend on **Render/Railway**:

1. **Deploy Backend**:
   - Set Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `node src/server.js`
   - Set `CLIENT_URL=https://your-frontend.vercel.app`
2. **Deploy Frontend on Vercel**:
   - Set Root Directory: `frontend`
   - Framework Preset: `Vite`
   - Add environment variables:
     - `VITE_API_URL=https://your-backend.onrender.com/api`
     - `VITE_SOCKET_URL=https://your-backend.onrender.com`
     - Plus the `VITE_FIREBASE_*` variables.
   - Deploy!

---

## 💻 Local Development

```bash
# 1. Install root dependencies and build
npm run build

# 2. Run Backend (Port 5000)
cd backend
node src/server.js

# 3. In another terminal, run Frontend (Port 5173)
cd frontend
npm run dev
```

Visit `http://localhost:5173` to test.
