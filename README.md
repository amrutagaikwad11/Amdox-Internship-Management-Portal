# Internship Management Portal

A highly polished full-stack web application designed to streamline the complete internship lifecycle for organizations, mentors, and interns. This version is running as a cohesive Full-Stack Node.js & React.js live deployment on Cloud Run with full mobile responsiveness, ambient analytics, local mock JSON persistence, and integrated Gemini AI performance analysis rules.

---

## Technical Stack (Current Run Implementation)

### Frontend Engine
* **React.js** with Vite dev architecture
* **Tailwind CSS** for visual pairings (using custom modern off-whites and deep indigo color themes)
* **Lucide React** for unified vector dashboard icons
* **HTML5 Canvas & Responsive SVG** for live analytics diagrams (Tasks Status Pie Chart and Domain bar charts)
* **React Hooks & Local State Managers** for authentication sessions, attendance, and evaluation forms

### Backend Routing & Middleware
* **Node.js & Express.js** configured on port `3000`
* **JWT Token Authentication** (signed using HMAC SHA-256 signatures)
* **Secure Cryptographic Hashing** (SHA-256 based encryption matching BCrypt specifications)
* **Local Database Store** via structured JSON file logic (`database.json`) with auto-seeding
* **AI Analysis Endpoint** leveraging the official `@google/genai` model engine with standard fallback behaviors

---

## Features

### 🔐 1. Authentication & Authorization
* Complete secure JWT token-based login.
* Roles Support: **Admin**, **Mentor**, and **Intern** workspaces.
* Strict API filters and role guards preventing unauthorized modifications.

### 👥 2. Student Onboarding
* Onboard form supporting Resume files and Profile Photos using safe Base64 transmission handlers.
* Automated allocation helper to assign a mentor to a new student on the fly.
* Detailed metadata storage including joining date, college, domain, and skills.

### 🤝 3. Mentor Allocation
* Reassign or view mentors assigned to specific interns.
* Distinct mentor dashboards showcasing allocated student details, evaluations, and attendance rates.

### 📋 4. Task Assignment Kanban Board
* Multi-column interactive tracking: **Pending**, **In Progress**, and **Completed** cards.
* Change status manually or watch them update dynamically as interns push GitHub code links.
* Prioritize deadlines using High, Medium, or Low tags.

### 📥 5. Submission & Review Audit
* In-app submission forms accepting GitHub URLs and description notes.
* Live Review panel causing mentor approvals or requesting quick changes with integrated comments.

### 📅 6. Attendance Management
* Real-time Check-In & Check-Out buttons.
* Smart "Late" checker flag marking arrivals after 09:15 AM automatically based on local time.
* Real-time calculation of overall attendance averages dynamically displayed in profiles.

### 📊 7. Performance Evaluation with Integrated AI
* Quantitative 1-5 rating metrics (Communication, Task Completion, Technical Skills, Attendance, Team Collaboration).
* **Gemini AI Synthesis**: Mentors can trigger the "Write AI Analysis" button to auto-synthesize raw ratings and comments into professional bulleted executive summaries using `gemini-3.5-flash`.

### 📜 8. Certificate Generation
* Auto-generate unique verification IDs for interns completing the program.
* Downloadable layout showing intern name, domain track, mentor signatures, and an embedded QR code pointing to a public validation URL.

---

## Project Structure

```bash
/
├── database.json          # Main JSON database persistence (auto-seeded)
├── package.json           # Unified Workspace Dependencies (Express + React)
├── vite.config.js         # Single-Port development and bundle pipelines
├── server/
│   ├── db.js              # Mock JPA/ORM database driver and schema defaults
│   ├── auth.js            # Cryptographic token signing and password hashing
│   └── server.js          # Express app server, API controllers, and static server fallback
└── src/
    ├── App.jsx            # Multi-view workspace, state routing, and persistent login checks
    ├── index.css          # Global styles using modern Tailwind @imports
    └── components/        # Individual feature dashboards
        ├── DashboardView.jsx   # Analytics cards, SVG pie charts, and Live check-in clock
        ├── InternsView.jsx     # Onboard profiles, CV viewers, and mentor re-allocation tools
        ├── TasksView.jsx       # Tri-column Kanban board, reviews, and submission flow
        ├── EvaluationsView.jsx # Performance metrics and integrated Gemini AI feedback loop
        └── CertificatesView.jsx# Embedded certificates and QR Code public verification layouts
```

---

## Installation & Setup

### Clone and Run in local Environment
1. Clone this package directory to your computer.
2. Run command to install base modules:
   ```bash
   npm install
   ```
3. Set your custom environment secrets inside a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY="your_api_key_here"
   JWT_SECRET="custom_secret_key"
   PORT=3000
   ```
4. Fire up the development environment:
   ```bash
   npm run dev
   ```
5. Build and compile production static bundle:
   ```bash
   npm run build
   ```

---
