# 24CS810 – MODERN FRONT-END FRAMEWORKS AND SPA DEVELOPMENT

## PROJECT RECORD

**NAME OF STUDENT:** Kankanala Venkata Surya Yaswin  
**REGD NO:** 241FA04B99  
**PROJECT TITLE:** ChatSphere – Real-Time Chat Application  
**FACULTY SIGNATURE:** __________________________  

---

# AIM

To design and develop ChatSphere, a real-time chat application that enables users to communicate through instant messaging. The application provides secure user authentication, one-to-one conversations, user discovery, public and private channels, and AI-powered chat assistance. It uses a React-based frontend and a Node.js and Express backend with Socket.IO to support real-time communication.

---

# SOFTWARE REQUIREMENTS

- **Operating System:** Windows 10/11
- **Frontend Framework:** React.js (v18.3.1), HTML5, CSS3, JavaScript (ES6+)
- **Frontend Build Tool:** Vite (v6.1.0)
- **Styling:** Tailwind CSS (v3.4.17), Lucide React Icons
- **Backend Environment:** Node.js (v20+ / v25+) and Express.js (v4.21.2)
- **Real-Time Communication:** Socket.IO (v4.8.1)
- **Authentication:** Firebase Authentication (v13.1.0 Web SDK)
- **Google Authentication:** Firebase Google OAuth Provider
- **Backend Token Verification:** Firebase Admin SDK (v14.5.0) & JWT-based authentication
- **Database:** Pure JavaScript JSON-based persistent storage (`backend/data/db.json` & `image_registry.json`)
- **Media & File Storage:** Persistent multi-part image storage with disk caching & registry re-materialization
- **AI Integration:** Google Gemini API & Local NLP contextual summarization engine
- **Code Editor:** Visual Studio Code
- **Web Browser:** Google Chrome
- **Package Manager:** npm
- **Deployment Platform:** Render (Web Service & Static Site)
- **Version Control:** Git and GitHub

---

# OBJECTIVE

To develop a responsive and user-friendly real-time communication platform that allows registered users to securely connect and exchange messages.

The main objectives are:

1. **Secure Multi-Method Authentication:** To provide secure user registration and login using email/password authentication and Google OAuth via Firebase with unique email and contact number constraints.
2. **User Discovery & Identification:** To assign every registered user a permanent, unique alphanumeric identification code (e.g., `CS7G7CL`) and enable search by Unique Code or Contact Number.
3. **Instant One-to-One Messaging:** To support instant direct messaging with sub-second latency using Socket.IO WebSockets.
4. **Live Presence & Status Receipts:** To provide live online/offline indicators, message delivery receipts (`sent`, `delivered`, `read`), and real-time typing indicators.
5. **Channel Communication:** To create and manage public channels for community discussions and private channels with passcode protection.
6. **Passcode Protection for Private Channels:** To secure private channels (such as the official Vignan community channel) with bcrypt-hashed passcodes (e.g., passcode `1299`).
7. **Comprehensive Profile Management:** To mandate 8 profile fields (Full Name, Username, Gender, DOB, Phone, Email, Profile Photo, Interests) before account activation and enforce a 10-day deletion hold policy.
8. **Persistent Media Storage:** To support uploading and persistent retrieval of JPG, JPEG, PNG, and WEBP profile photos across server restarts.
9. **AI Chat Assistance & Summarization:** To integrate AI chat assistance with one-click conversation summarization (Main Topics, Key Takeaways, Pending Questions).
10. **Modern Responsive Design:** To provide responsive dark and light themes optimized for mobile and desktop screens.
11. **Cloud Deployment:** To deploy the frontend and backend live on Render.

---

# PROJECT STRUCTURE

```text
realtime-chat-app/
│
├── backend/
│   ├── data/
│   │   ├── db.json                     # Persistent database records (Users, Channels, Messages)
│   │   └── image_registry.json         # Persistent media and profile image backup registry
│   │
│   ├── src/
│   │   ├── aiAgent.js                  # Nova AI service (Gemini API integration & fallback)
│   │   ├── aiSummary.js                # AI conversation summarization engine
│   │   ├── auth.js                     # Firebase Admin SDK verification & JWT authentication
│   │   ├── db.js                       # Database models, constraints, and query handlers
│   │   ├── photoValidation.js          # Photo integrity and format validation helper
│   │   ├── server.js                   # Main Express application, static serving, and CORS
│   │   ├── socket.js                   # Socket.IO real-time event handlers & presence tracker
│   │   │
│   │   ├── routes/
│   │   │   ├── authRoutes.js           # Authentication endpoints (/register, /login, /verify)
│   │   │   └── chatRoutes.js           # Profile, messaging, channel, and upload endpoints
│   │   │
│   │   └── storage/
│   │       └── imageStore.js           # Persistent image storage with ephemeral recovery
│   │
│   ├── uploads/                        # Dedicated directory for profile photos & attachments
│   │   └── profile-images/
│   ├── test-suite.js                   # Automated test suite (28 comprehensive test cases)
│   ├── .env.example                    # Environment variable templates
│   └── package.json                    # Backend dependencies & scripts
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ai/
│   │   │   │   └── AiDrawer.jsx        # Nova AI assistant drawer
│   │   │   ├── auth/
│   │   │   │   └── LoginModal.jsx      # Modern Sign In & Sign Up modal with Google OAuth
│   │   │   ├── chat/
│   │   │   │   ├── AiChatSummaryModal.jsx # AI conversation summary modal
│   │   │   │   ├── ChatArea.jsx        # Active conversation header, messages stream & input
│   │   │   │   ├── FindPeopleModal.jsx # User discovery search by code or phone
│   │   │   │   ├── MessageInput.jsx    # Text input, emoji picker, attachment upload
│   │   │   │   ├── MessageItem.jsx     # Individual message bubble, reactions & receipts
│   │   │   │   └── RightDetailsSidebar.jsx # Contact details, channel members & shared media
│   │   │   ├── common/
│   │   │   │   └── ChatSphereLogo.jsx  # SVG branded application logo
│   │   │   ├── header/
│   │   │   │   └── TopHeader.jsx       # Header bar, network status & profile dropdown
│   │   │   ├── help/
│   │   │   │   └── HelpModal.jsx       # Help guide and FAQ
│   │   │   ├── profile/
│   │   │   │   ├── OnboardingModal.jsx # Mandatory 8-field onboarding profile completion
│   │   │   │   └── ProfileModal.jsx    # My Profile view, photo editor & account deletion
│   │   │   ├── settings/
│   │   │   │   └── SettingsModal.jsx   # Theme switcher, notifications, server settings
│   │   │   └── sidebar/
│   │   │       ├── CreateChannelModal.jsx # Channel creation modal
│   │   │       ├── ExploreChannelsModal.jsx # Discover public & passcode-protected channels
│   │   │       ├── JoinChannelModal.jsx   # Channel passcode entry dialog
│   │   │       └── Sidebar.jsx            # Channels, DMs, online friends & search navigation
│   │   │
│   │   ├── context/
│   │   │   ├── AuthContext.jsx         # Global authentication state & user session
│   │   │   └── SocketContext.jsx       # Global Socket.IO connection & event dispatchers
│   │   │
│   │   ├── firebase/
│   │   │   └── config.js               # Firebase Client SDK configuration & auth handlers
│   │   │
│   │   ├── services/
│   │   │   └── api.js                  # Centralized HTTP API client with auth token headers
│   │   │
│   │   ├── utils/
│   │   │   └── avatar.js               # Universal avatar URL resolver and error fallback
│   │   │
│   │   ├── App.jsx                     # Root application coordinator & routing guard
│   │   ├── main.jsx                    # Application entry point mounting DOM
│   │   └── index.css                   # Tailwind CSS imports & animations
│   │
│   ├── index.html                      # HTML template
│   ├── vite.config.js                  # Vite build and proxy configuration
│   └── package.json                    # Frontend dependencies & scripts
│
├── Dockerfile                          # Multi-stage Docker deployment definition
├── render.yaml                         # Render infrastructure blueprint
└── package.json                        # Root workspace scripts
```

---

# SOURCE CODE SUMMARY

## BACKEND

The backend is developed using Node.js and Express.js. It handles authentication, application routes, data operations, real-time communication, and AI-related functionality.

**1. `backend/src/server.js`**
Acts as the main entry point of the backend application. Initializes the Express application, configures CORS with `Cross-Origin-Resource-Policy: cross-origin`, serves static uploads with caching headers, mounts API routes, initializes the Socket.IO server, and boots the persistent image storage subsystem.

**2. `backend/src/auth.js`**
Handles authentication operations, verifying Firebase ID Tokens via Firebase Admin SDK with fallback claim verification, generating HMAC SHA-256 signed JSON Web Tokens (JWT) for session management, and enforcing the `authMiddleware` gatekeeper on protected routes.

**3. `backend/src/db.js`**
Manages JSON database persistence (`backend/data/db.json`). Enforces model-level unique constraints for normalized email addresses and contact numbers via `DuplicateKeyError`, generates 7-character alphanumeric identification codes (`CS` prefix), and provides CRUD operations for users, channels, conversations, and messages.

**4. `backend/src/socket.js`**
Manages full-duplex real-time communication using Socket.IO. Tracks active socket connections, broadcasts live online/offline presence statuses, delivers direct messages, broadcasts typing indicators, and manages real-time message read receipts (`sent`, `delivered`, `read`).

**5. `backend/src/aiAgent.js` & `backend/src/aiSummary.js`**
Provides AI-assisted conversational intelligence. Integrates with Google Gemini API and includes a fallback NLP engine (`localNlpSummarize`) that extracts Main Topics, Important Points, and Pending Follow-up Questions from conversation histories.

**6. `backend/src/storage/imageStore.js`**
Provides resilient image storage for Render deployments. Writes uploaded profile pictures into `uploads/profile-images/`, records metadata in `image_registry.json`, and automatically re-materializes images onto disk on server restart if running on an ephemeral filesystem.

**7. `backend/src/photoValidation.js`**
Enforces strict profile photo validation on the backend, verifying that uploaded photos exist on disk with valid image extensions (`.jpg`, `.jpeg`, `.png`, `.webp`) or are authentic Google profile photo URLs, while rejecting temporary `blob:`, `file://`, `C:\...`, or placeholder links.

**8. `backend/src/routes/authRoutes.js`**
Exposes authentication endpoints: `POST /api/auth/register` (with mandatory validations), `POST /api/auth/login`, `POST /api/auth/verify` (Firebase Google OAuth verification and account linking), `GET /api/auth/me`, and `GET /api/auth/firebase-config`.

**9. `backend/src/routes/chatRoutes.js`**
Exposes application endpoints: `POST /api/upload` (open to registration and authenticated uploads), `GET /api/users`, `GET /api/users/search`, `PUT /api/users/profile`, `DELETE /api/users/account` (enforcing a 10-day retention policy), channel management, and messaging APIs.

---

## FRONTEND

The frontend is developed using React.js and Vite. It provides an intuitive single-page application (SPA) user interface for authentication, real-time messaging, channels, profile customization, and AI assistance.

**1. `frontend/src/App.jsx`**
The root React component. Enforces authentication and registration completion guards: unauthenticated visitors receive `LoginModal`, incomplete accounts are directed to `OnboardingModal`, and fully onboarded users enter `AuthenticatedApp`.

**2. `frontend/src/main.jsx`**
The entry point of the React application. Renders `App` into the DOM wrapped in `AuthProvider`.

**3. `frontend/src/context/AuthContext.jsx`**
Manages authentication state, token storage in `localStorage`, user session validation on mount via `api.getMe()`, sign-in, sign-up, Google OAuth popup flows, profile updates, and sign-out.

**4. `frontend/src/context/SocketContext.jsx`**
Initializes and maintains the client Socket.IO WebSocket connection. Dispatches real-time events for sending messages, typing status, message delivery receipts, channel joins, and online presence tracking.

**5. `frontend/src/firebase/config.js`**
Initializes Firebase Client SDK, configuring `GoogleAuthProvider`, `signInWithPopup`, and auth state change listeners with automatic configuration syncing.

**6. `frontend/src/components/auth/LoginModal.jsx`**
Modern authentication modal supporting both Email/Password login/registration and "Continue with Google". Includes an image picker with instant preview for profile photos during registration.

**7. `frontend/src/components/profile/OnboardingModal.jsx`**
Mandatory profile onboarding modal that enforces completion of all 8 mandatory fields (Full Name, Username, Gender, DOB, Phone, Email, Profile Photo, Interests) before unlocking dashboard access.

**8. `frontend/src/components/profile/ProfileModal.jsx`**
Comprehensive profile view and editing interface. Displays user information, permanent Unique Identification Code, interests tags, photo upload editor, and the 10-day account deletion hold.

**9. `frontend/src/components/chat/ChatArea.jsx`**
Main chat window featuring conversation partner header, online status indicator, scrollable message history, real-time typing indicators, and the AI Conversation Summary button.

**10. `frontend/src/components/chat/MessageItem.jsx`**
Renders message bubbles with resolved avatars, formatted timestamps, formatted markdown code spans, image attachment previews, and delivery receipts (`✓`, `✓✓`, blue `✓✓`).

**11. `frontend/src/components/chat/MessageInput.jsx`**
Input container supporting message composition, emoji picker, file/media attachment selection, and real-time typing indicator broadcast.

**12. `frontend/src/components/chat/FindPeopleModal.jsx`**
User discovery modal enabling searches across registered users by Unique Identification Code or Contact Number.

**13. `frontend/src/components/chat/AiChatSummaryModal.jsx`**
Modal presenting AI-generated conversation summaries structured into Main Topics, Key Points, and Pending Action Items.

**14. `frontend/src/components/sidebar/Sidebar.jsx` & `ExploreChannelsModal.jsx`**
Sidebar navigation hosting channel lists, direct message conversations, and the "Explore Channels" discovery modal for joining public channels or entering private channel passcodes.

**15. `frontend/src/utils/avatar.js`**
Centralized helper resolving relative image paths against the backend origin and providing automatic fallback to initials if an image encounters a network error.

---

# OUTPUTS

The following screenshots should be inserted in this section after capturing them from the deployed ChatSphere application:

### OUTPUT 1: LOGIN PAGE
*(Insert screenshot of the ChatSphere Sign In page showing Google OAuth and Email options)*

### OUTPUT 2: USER REGISTRATION & PROFILE ONBOARDING
*(Insert screenshot of the Registration and Onboarding interface showing mandatory fields and profile photo upload)*

### OUTPUT 3: MAIN CHAT DASHBOARD
*(Insert screenshot of the main 3-column ChatSphere dashboard with active theme)*

### OUTPUT 4: ONE-TO-ONE INSTANT MESSAGING
*(Insert screenshot showing a live conversation between two users with timestamps and delivery checkmarks)*

### OUTPUT 5: USER DISCOVERY & SEARCH
*(Insert screenshot showing user search by Unique Identification Code or Contact Number)*

### OUTPUT 6: PUBLIC & PRIVATE CHANNELS
*(Insert screenshot showing the Explore Channels modal and passcode verification for the Vignan channel)*

### OUTPUT 7: USER PROFILE & SETTINGS
*(Insert screenshot showing user profile details, permanent identification code, and theme toggle)*

### OUTPUT 8: AI CHAT CONVERSATION SUMMARY
*(Insert screenshot showing the AI Conversation Summary modal with key takeaways and follow-up points)*

---

# RESULT

The **ChatSphere Real-Time Chat Application** was successfully designed, developed, tested, and deployed for course **24CS810 – Modern Front-End Frameworks and SPA Development**. The application satisfies all project objectives by delivering secure multi-provider authentication (Email/Password & Google OAuth), instant one-to-one messaging via WebSockets, discovery via permanent unique identification codes, passcode-protected private channels (Vignan hub), persistent media storage, and AI-powered conversation summarization. The complete application has been built and deployed live on Render with automated continuous deployment from GitHub.

**Student Name:** Kankanala Venkata Surya Yaswin  
**Registration Number:** 241FA04B99  
**GitHub Repository:** https://github.com/Yaswinkankanala/Real-time-Chat-Application  
**Live Application URL:** https://chatsphere-frontend-9o36.onrender.com  

