# TubeToMD - Project Roadmap & Progress Tracker

> **Purpose:** This document serves as the central source of truth for all upcoming feature development, migration tasks, and project enhancements. It is designed to track progress and allow for custom comments/reviews for each step.

---

## 🟢 Phase 1: Core UI & Infrastructure (Completed)
- [x] Migrate AI infrastructure from Gemini to Groq (Backend & Python)
- [x] Refactor `SessionPage.tsx` to 3-column "Nocturne Rose" layout
- [x] Integrate global glassmorphism CSS and theme tokens
- [x] Restore and fix Video Player, Transcript, and Chat components
- [x] Fix all TypeScript compilation errors

---

## 🟡 Phase 2: High Priority Features (Completed)

### 1. Google OAuth Frontend Integration
- **Goal:** Add Google Sign-In support to the `LoginPage` and `RegisterPage`, and handle the OAuth callback flow seamlessly.
- **Tasks:**
  - [x] Implement "Continue with Google" buttons on auth forms.
  - [x] Add `/auth/google/callback` route for handling JWT retrieval.
  - [x] Update Zustand auth store with token parsing.
- **Status:** Completed
- **Comments/Reviews:**
  - *Implemented successfully with existing components and updated React Router to handle callbacks elegantly.*

### 2. Note Editing (Inline Markdown Editor)
- **Goal:** Allow users to directly edit AI-generated markdown notes inline.
- **Tasks:**
  - [x] Add an "Edit Note" toggle button in the Note Viewer component.
  - [x] Integrate a responsive `textarea` or markdown editor package.
  - [x] Wire up `PUT /api/v1/notes/:id` to save the edited content.
- **Status:** Completed
- **Comments/Reviews:**
  - *Added fully responsive inline textarea matching the Nocturne Rose glassmorphism theme.*

### 3. Session Polling Auto-Update
- **Goal:** Automatically refresh the UI instead of relying on manual reload when a session finishes transcribing/processing.
- **Tasks:**
  - [x] Implement `useSessionPolling.ts` custom hook.
  - [x] Hook into `SessionPage` and `DashboardPage` to fetch latest status seamlessly.
  - [x] Add toast notification upon completion.
- **Status:** Completed
- **Comments/Reviews:**
  - *(Add comments here...)*

### 4. Dark Mode Toggle
- **Goal:** Add a theme switcher in the Navbar for user preference.
- **Tasks:**
  - [ ] Implement theme context or use Tailwind's `dark` strategy.
  - [ ] Add toggle icon (Sun/Moon).
  - [ ] Persist choice to `localStorage`.
- **Status:** Not Started
- **Comments/Reviews:**
  - *(Add comments here...)*

---

## 🟠 Phase 2.5: Wire Orphaned Backend Features (Completed ✅)

> *Discovered during full project audit — these backend features were fully implemented but had no frontend UI.*

### 4.5. PDF Report Download
- **Goal:** Surface the existing `GET /sessions/:id/report` PDF generation endpoint in the UI.
- **Tasks:**
  - [x] Add "Download Report" button to SessionPage action bar.
  - [x] Wire to `api.get('/sessions/:id/report', { responseType: 'blob' })`.
- **Status:** Completed
- **Comments/Reviews:**
  - *Added `handleDownloadReport` handler and a styled `FileDown` button below the action grid.*

### 4.6. Clear Chat History
- **Goal:** Let users clear their AI chat history for a session.
- **Tasks:**
  - [x] Add "Clear Chat" icon button in the Chat panel header.
  - [x] Wire to `api.delete('/chat/:sessionId')`.
- **Status:** Completed
- **Comments/Reviews:**
  - *Added `Eraser` icon button next to the "Online" indicator. Only visible when messages exist. Includes confirmation dialog.*

### 4.7. Real DOCX Export
- **Goal:** Replace the Markdown fallback in DOCX export with a proper Word document.
- **Tasks:**
  - [x] Install `docx` npm package in backend.
  - [x] Implement MD→DOCX conversion in `export.service.ts`.
- **Status:** Completed
- **Comments/Reviews:**
  - *Fully rewrote `exportDOCX()` using the `docx` package. Generates structured Word documents with headings, bold/italic text, bullet points, code blocks, and metadata.*

---

## 🔵 Phase 3: Medium Priority Features

### 5. Advanced Note Generation UI
- **Goal:** Enhance the generation form with specific user requests.
- **Tasks:**
  - [ ] **Persona Selector:** Dropdown for selecting summary persona before generation.
  - [ ] **Time Range Notes:** UI slider/inputs for selecting a transcript time range.
  - [ ] **Topic Focus:** Text input to specify a focus topic for the LLM.
- **Status:** Not Started
- **Comments/Reviews:**
  - *(Add comments here...)*

### 6. Interactive Transcript Search
- **Goal:** Allow users to search for spoken phrases instantly.
- **Tasks:**
  - [ ] Add search bar above transcript.
  - [ ] Implement keyword highlighting of matches within the transcript viewport.
  - [ ] Add "Next/Previous match" controls.
- **Status:** Not Started
- **Comments/Reviews:**
  - *(Add comments here...)*

### 7. Flashcard Study Mode
- **Goal:** Interactive study interface based on AI-generated flashcard notes.
- **Tasks:**
  - [ ] Create a dedicated flashcard component (flip animations).
  - [ ] Parse markdown flashcards into structured JSON format on frontend.
  - [ ] Build quiz/review UI.
- **Status:** Not Started
- **Comments/Reviews:**
  - *(Add comments here...)*

### 8. Session Management & Search
- **Goal:** Give users better tools to organize their content.
- **Tasks:**
  - [ ] Add global search bar to Dashboard (searches title & transcript content).
  - [ ] Implement session deletion (trash icon).
- **Status:** Not Started
- **Comments/Reviews:**
  - *(Add comments here...)*

---

## 🟣 Phase 4: Lower Priority & Polish

### 9. Export & Sharing
- **Goal:** Allow for more ways to export data.
- **Tasks:**
  - [ ] **DOCX Export:** Generate Word documents from Notes.
  - [ ] **Sharing:** Generate a public link for a read-only Session/Note view.
  - [ ] **Batch Generation:** Generate multiple note types simultaneously.
- **Status:** Not Started
- **Comments/Reviews:**
  - *(Add comments here...)*

### 10. System DevOps & Polish
- **Goal:** Prepare the application for production deployment.
- **Tasks:**
  - [ ] Rate Limiting (Express-rate-limit).
  - [ ] Input Validation (Zod).
  - [ ] Dockerfiles & `docker-compose.yml`.
  - [ ] Unit Tests (Frontend & Backend).
- **Status:** Not Started
- **Comments/Reviews:**
  - *(Add comments here...)*

---

## 📝 General Project Notes
- **Design System:** All new components *must* conform to the "Nocturne Rose" dark-glass aesthetic established in `index.css`.
- **Error Handling:** Backend errors should seamlessly trigger `toast.error()` via Axios interceptors.
