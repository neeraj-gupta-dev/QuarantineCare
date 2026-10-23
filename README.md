# QuarantineCare 🏥

> **QuarantineCare** is a clinical management and patient workflow platform purpose-built for high-occupancy virus quarantine and isolation facilities (74-bed capacity). It enforces rigorous clinical business rules across bedside nursing rounds, attending physician evaluations, and administrative discharge governance.

---

## 📌 Context & Clinical Operational Model

- **Facility Capacity**: Exactly 74 quarantine beds.
- **Pathogen Profile**: High-consequence viral infection with an expected benchmark mortality of 15% (target cure/survival benchmark: 85%). Fever ($\ge 100.4^\circ\text{F}$ / $38.0^\circ\text{C}$) is the hallmark primary clinical biomarker.
- **Cure Benchmark**: A patient is certified **CURED** only after completing **3 full consecutive calendar days** without fever ($< 100.4^\circ\text{F}$).
- **Daily Clinical Process**:
  1. **Morning Temperature Measurement (Nurse)**: Every patient must have their temperature recorded first.
  2. **Clinical Round & Notes (Doctor)**: Attending physicians conduct rounds and enter treatment notes only *after* the morning temperature is documented.
  3. **Discharge Governance (Admin)**: When a patient achieves a 3-day fever-free streak, attending doctors recommend discharge. Administrators review the queue and approve discharge, releasing the bed for incoming patients.

---

## 🏗️ System Architecture

QuarantineCare is structured as a clean, deployable monorepo:

```
QuarantineCare/
├── client/                      # React 18 + Vite + TypeScript SPA
│   ├── src/
│   │   ├── components/          # Reusable UI (BedMap, DemoDrawer, TemperatureChart, Header, Modals)
│   │   ├── context/             # AuthContext (JWT memory+storage) & UnitContext (°F/°C toggle)
│   │   ├── pages/               # Role views (Nurse, Doctor, Admin, Discharges, Detail, Directory)
│   │   ├── services/api.ts      # Axios API client with automatic JWT bearer attachment
│   │   └── types/               # Strict TypeScript clinical domain interfaces
│   ├── vercel.json              # SPA rewrite rule for deep linking on Vercel
│   └── package.json
│
├── server/                      # Node.js + Express + TypeScript REST API
│   ├── src/
│   │   ├── config/              # MongoDB Atlas connection (Mongoose)
│   │   ├── helpers/             # Business rules engine, streak calculator, dayKey utilities
│   │   ├── middleware/          # JWT authentication, role authorization, error handling
│   │   ├── models/              # User, Patient, TemperatureReading, DoctorVisit, Notification, AuditLog
│   │   ├── routes/              # /api/auth, /api/patients, /api/dashboard, /api/notifications, /api/demo
│   │   └── scripts/seed.ts      # 74-bed comprehensive clinical seed dataset
│   ├── tests/                   # Jest + Supertest automated test suites (90 unit & API tests)
│   └── package.json
```

### Technology Stack
- **Backend**: Express.js, TypeScript, Mongoose (MongoDB Atlas), Helmet security headers, CORS restricted to `CLIENT_URL`, bcryptjs, jsonwebtoken.
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide icons, TanStack React Query, Recharts.
- **Deployment**:
  - Client deployable to **Vercel** (with `vercel.json` SPA deep-link rewrite).
  - Server deployable to **Render** (`npm run build` $\rightarrow$ `npm start`).

---

## 👥 Roles & Responsibilities

| Role | Default Demo Login | Primary Responsibilities |
|---|---|---|
| **Nurse** | `nurse@demo.com` / `demo123` | Morning bedside temperature rounds, temperature corrections with justification, vital signs monitoring. |
| **Doctor** | `doctor@demo.com` / `demo123` | Patient rounds, clinical treatment notes, medication orders, discharge certifications, marking deceased cases. |
| **Admin** | `admin@demo.com` / `demo123` | 74-bed capacity monitoring, compliance oversight, mortality analytics vs 15% benchmark, patient admissions, discharge approvals. |

---

## 🛡️ Enforced Business & Clinical Rules

All rules are strictly validated on the **Server** (returning machine-readable codes and HTTP statuses) and mirrored in the **Client UI** (disabling actions and rendering clear contextual guidance):

### 1. Temperature Measurement (Nurse Only)
- **Role Guard**: Only users with the `nurse` role can record temperatures (`403 Forbidden` otherwise).
- **One Reading Per Day**: A patient can only have one primary reading per calendar day. Attempting a second reading returns `409 Conflict` (`DUPLICATE_READING`) with `"Already recorded today at HH:MM by <nurse>"`.
- **Correction Mode**: Nurses can record corrections by explicitly selecting "Add correction" and supplying a mandatory justification (`400 Bad Request` if reason is omitted).
- **Valid Physiologic Range**: Values must be strictly between **90.0°F and 110.0°F** (`INVALID_RANGE`, `400 Bad Request`). UI prevents out-of-range submission.
- **Critical Fever Warning**: Readings $\ge 104.0^\circ\text{F}$ trigger an urgent clinical alert banner in the UI and automatically dispatch high-priority notifications to attending doctors.
- **Unusual Change Warning**: If a reading deviates by $> 3.0^\circ\text{F}$ from the patient's previous reading, a warning prompt requires nurse confirmation before saving.

### 2. Doctor Visits (Doctor Only)
- **Prerequisite Blocker**: Doctor visits are locked until today's morning temperature has been recorded (`400 Bad Request`, `WAITING_FOR_TEMPERATURE`, `"Waiting for nurse's temperature reading"`).
- **Mandatory Notes**: Clinical treatment notes are required (`400 Bad Request`, `MANDATORY_NOTES`).
- **Follow-up Appending**: If a physician has already visited a patient today, subsequent entries automatically append as follow-up progress notes (`DOCTOR_FOLLOW_UP_VISIT`).

### 3. Streak & Discharge Lifecycle
- **Streak Evaluation**:
  - A calendar day increments the fever-free streak only if a reading exists **AND** is below the threshold ($< 100.4^\circ\text{F}$).
  - Any fever reading resets the streak to `0`.
  - Any missing day breaks the streak.
- **Recommend Discharge**: Allowed exclusively when `feverFreeStreak >= 3` and patient is in `ADMITTED` status. Recommending transitions patient to `READY_FOR_DISCHARGE` and alerts Administration.
- **Discharge Approval (Admin Only)**: Only administrators can approve discharges for `READY_FOR_DISCHARGE` patients. Approving discharge releases the patient's bed immediately and sets status to `DISCHARGED_CURED`.
- **Fever Spike Auto-Reversion**: If a patient in `READY_FOR_DISCHARGE` status subsequently records a fever ($\ge 100.4^\circ\text{F}$), the system automatically reverts their status to `ADMITTED`, clears recommendation metadata, resets streak to `0`, logs `DISCHARGE_AUTO_REVERTED`, and notifies both doctors and admins.

### 4. Governance & Safety
- **Read-Only Invariant**: Patients in `DISCHARGED_CURED` or `DECEASED` status are permanently immutable (`400 Bad Request`, `READ_ONLY`).
- **Bed Management**: Bed assignments are automatically cleared upon discharge or death, immediately releasing the slot for incoming admissions.
- **Audit Trail**: Every state mutation (admission, temperature, visit, discharge recommendation, discharge approval, death) logs an immutable entry in the `AuditLog` collection.
- **End-of-Day 6:00 PM Warning Banner**: Displays an alert banner on nurse and doctor home screens if unmeasured or unvisited patients remain after 6:00 PM.

---

## ⚡ Demo Controls Drawer

To facilitate live demonstrations, QuarantineCare includes a floating **Demo Controls** drawer (accessible via the `⚡ Demo Controls` button in the lower-right corner):
1. **Simulate Next Day (+1 Day)**: Advances the facility calendar date by 1 day, resetting daily compliance and advancing streak evaluations.
2. **Reset All Demo Data**: Restores the database to its pristine 74-bed capacity state with pre-populated multi-day clinical trajectories.
3. **Quick Persona Switcher**: Instantly switch between Nurse, Doctor, and Admin without logging out.

---

## 🧪 Automated Testing

QuarantineCare features a comprehensive test suite (90 passing tests) covering all business rules, API endpoints, role authorizations, and edge cases:

```bash
# Run server test suite
cd server
npm test
```

Test files:
- `tests/rules.test.ts`: Complete coverage of all 21 core clinical rules.
- `tests/api.test.ts`: Integration test suite for auth, patients, dashboard, and notifications.
- `tests/helpers/businessRules.test.ts`: Pure unit tests for temperature evaluation and streak calculations.
- `tests/helpers/getToday.test.ts`: Date key manipulation and time simulation tests.

---

## 🚀 Environment Setup & Deployment

### Prerequisites
- Node.js 18+
- MongoDB Atlas database cluster

### 1. Server Configuration (`server/.env`)
Create `server/.env` based on `server/.env.example`:
```ini
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/quarantinecare?retryWrites=true&w=majority
JWT_SECRET=super_secret_jwt_key_quarantine_care_2026
CLIENT_URL=http://localhost:5173
```

### 2. Client Configuration (`client/.env`)
Create `client/.env` based on `client/.env.example`:
```ini
VITE_API_URL=http://localhost:5000/api
```

### 3. Installation & Local Development

```bash
# 1. Install dependencies
cd server && npm install
cd ../client && npm install

# 2. Seed database with initial 74-bed dataset
cd ../server
npm run seed

# 3. Start development servers
# Terminal 1 (Server):
cd server && npm run dev

# Terminal 2 (Client):
cd client && npm run dev
```

Visit `http://localhost:5173` in your browser.

### 4. Production Build Commands

- **Server (Render)**:
  - Build Command: `npm install && npm run build`
  - Start Command: `npm start`
  - Health check endpoint: `/health`
- **Client (Vercel)**:
  - Framework Preset: `Vite`
  - Build Command: `npm run build`
  - Output Directory: `dist`
  - Routing: Automatically handled by `vercel.json` rewrites.

---

## 🎬 End-to-End Demo Script (Evaluator Guide)

Follow this 5-minute walkthrough to test every feature of QuarantineCare:

1. **Login & Nurse Temperature Round**:
   - Navigate to `/login` and click **"Demo as Nurse"**.
   - Note the **Onboarding Tip** and the **End-of-Day Round Alert (Past 6:00 PM)** banner.
   - Click on any pending patient (e.g. Bed 1).
   - Enter `85.0°F` $\rightarrow$ note the range validation rejection and disabled button.
   - Enter `104.5°F` $\rightarrow$ note the critical fever alert banner.
   - Enter `98.4°F` and click **Save Reading** $\rightarrow$ card immediately shifts to "Done today".
   - Click the same patient again $\rightarrow$ note duplicate warning `"Already recorded today at ... by Nurse"`. Test correction mode by entering a reason.

2. **Doctor Rounds & Discharge Recommendation**:
   - Open **Demo Controls** drawer (bottom-right) and switch to **Doctor**.
   - Note the **Ready to visit** vs **Waiting for temp** tabs.
   - Click on Bed 1 $\rightarrow$ click **Record Visit**.
   - Notice button is disabled if treatment notes are blank. Enter clinical notes and save.
   - Click the button again $\rightarrow$ note it now says **"Append Follow-up Note"**.
   - Navigate to a patient with a 3-day fever-free streak (e.g., Bed 4). Note the green **Eligible for Discharge** banner.
   - Click **Recommend Discharge** $\rightarrow$ status changes to `READY_FOR_DISCHARGE` and Admin is notified.

3. **Admin Governance & Bed Release**:
   - Open **Demo Controls** drawer and switch to **Admin**.
   - View the **74-Bed Map** with clinical color coding.
   - Observe compliance rates and the **Mortality Rate vs 15% Benchmark**.
   - Go to **Discharges** (`/admin/discharges`), find the recommended patient, and click **Approve Discharge**.
   - Confirm in the dialog $\rightarrow$ patient is marked `DISCHARGED_CURED` and their bed is freed.
   - Go to **Admit Patient** (`/admin/admit`) $\rightarrow$ note that with a bed now available, the admission form is active. Enter a name and admit the patient $\rightarrow$ verify they are auto-assigned to the freed bed!

4. **Time Advancement & Reset**:
   - Open **Demo Controls** and click **Simulate Next Day (+1 Day)** $\rightarrow$ observe calendar date advance and rounds reset for the new morning cycle.
   - Click **Reset All Demo Data** $\rightarrow$ confirm to restore the pristine 74-bed benchmark dataset.
