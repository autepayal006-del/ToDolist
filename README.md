# TaskMate Pro — Complete Supabase Database Integration

**TaskMate Pro** is an ultra-modern, high-level GUI To-Do List and Productivity Web Portal engineered using pure vanilla **HTML5**, **CSS3**, and **JavaScript (ES6+)**, backed by **Supabase PostgreSQL**.

It combines sleek glassmorphism, dynamic ambient lighting, smart task organization, and a secure server-managed database persistence layer that replaces browser `localStorage` with a multi-tenant PostgreSQL database.

---

## 🏗️ Architectural Overview & Security Model

### The Challenge with No-Login Client-Only Databases
Because TaskMate has no customer login or registration screen, visitors must be able to use the app immediately. However:
- A shared Supabase publishable/anon key cannot cryptographically distinguish one visitor from another.
- Creating unrestricted Row Level Security (RLS) policies like `USING (true)` or `WITH CHECK (true)` on the public table would expose every visitor's tasks to all other visitors on the internet.
- Relying on client-stored UUIDs in `localStorage` provides zero security since any user could tamper with the ID and access or overwrite another user's tasks.

### The Solution: Server-Controlled Browser Ownership & Strict RLS
TaskMate implements a secure, robust architecture:
1. **HttpOnly Session Cookies**: When a browser connects to TaskMate, the Node.js server assigns a cryptographically random 64-character token in an `HttpOnly`, `SameSite=Strict`, `Secure` cookie (`taskmate_session`). JavaScript running in the browser cannot read, tamper with, or forge this cookie.
2. **Deterministic Server-Side Owner Derivation**: The server derives a unique UUID `owner_id` using an HMAC-SHA256 hash of the session token and the server-only `SESSION_SECRET`.
3. **Server-Validated CRUD Operations**: Every read, create, update, delete, and clear-completed operation is strictly filtered by the verified `owner_id`:
   - `GET /api/tasks` -> Fetches tasks where `owner_id = currentOwnerId`
   - `POST /api/tasks` -> Inserts new task stamped with `owner_id = currentOwnerId`
   - `PATCH /api/tasks/:id` -> Updates task ONLY WHERE `id = :id AND owner_id = currentOwnerId`
   - `DELETE /api/tasks/:id` -> Deletes task ONLY WHERE `id = :id AND owner_id = currentOwnerId`
   - `POST /api/tasks/clear-completed` -> Deletes tasks ONLY WHERE `owner_id = currentOwnerId AND is_completed = true`
4. **Strict Row Level Security (RLS)**: Direct public/anon access to `public.tasks` via the PostgREST API is revoked. Unrestricted queries cannot bypass security policies. Privileged database access is restricted exclusively to the backend using the server-side `SUPABASE_SERVICE_ROLE_KEY`.

---

## 🗄️ Database Schema Summary (`supabase-schema.sql`)

The `public.tasks` table is defined with the following structure:

| Column | Type | Constraints / Defaults | Description |
| --- | --- | --- | --- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique task identifier |
| `title` | `TEXT` | `NOT NULL CHECK (length(trim(title)) > 0 AND length(title) <= 255)` | Task description (non-empty) |
| `is_completed` | `BOOLEAN` | `NOT NULL DEFAULT false` | Status indicator |
| `priority` | `TEXT` | `NOT NULL DEFAULT 'low' CHECK (priority IN ('low', 'medium', 'high'))` | Urgency rating |
| `category` | `TEXT` | `NOT NULL DEFAULT 'work' CHECK (category IN ('work', 'personal', 'study', 'goals'))` | Focus tag |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Insertion timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Last update timestamp (auto-maintained via trigger) |
| `owner_id` | `UUID` | `NOT NULL` | Verified browser ownership identifier |

### Performance Indexes & Automated Triggers
- **Index on `owner_id`**: Fast lookups per visitor session.
- **Index on `(owner_id, is_completed)`**: Accelerated filtering and clear-completed operations.
- **Index on `created_at DESC`**: Chronological sorting efficiency.
- **Trigger `trg_tasks_updated_at`**: Automatically refreshes `updated_at` timestamp on every modification.

---

## 📋 Step-by-Step Supabase Setup Instructions

### Step 1: Open Your Supabase Project
1. Open your browser and navigate to your Supabase Project Dashboard:
   **[https://supabase.com/dashboard/project/tyapfcjbwlnkvypdkekw](https://supabase.com/dashboard/project/tyapfcjbwlnkvypdkekw)**
2. Sign in to your Supabase account if prompted.

### Step 2: Open the SQL Editor
1. In the left-hand navigation sidebar, click on the **SQL Editor** icon (represented by the `>_` terminal symbol).
2. Click **+ New Query** at the top.

### Step 3: Run `supabase-schema.sql`
1. Open the [supabase-schema.sql](supabase-schema.sql) file located in your project root.
2. Copy the entire file content and paste it into the Supabase SQL Editor.
3. Click the green **Run** button (or press `Ctrl+Enter` / `Cmd+Enter`).
4. You should see `Success. No rows returned`.

### Step 4: Confirm That the `tasks` Table Exists
1. Click on the **Table Editor** icon (represented by a grid/table icon) in the left sidebar.
2. Verify that **`tasks`** appears under the `public` schema.
3. Verify that all 8 columns (`id`, `title`, `is_completed`, `priority`, `category`, `created_at`, `updated_at`, `owner_id`) are present.

### Step 5: Verify Row Level Security (RLS)
1. In the Supabase Dashboard, click on **Authentication** -> **Policies** (or look at the table settings in the Table Editor).
2. Confirm that **Row Level Security (RLS) is Enabled** for `public.tasks`.
3. Notice that direct `anon` access is revoked: unauthorized requests cannot read or manipulate any data directly via the public REST API.

### Step 6: Configure Environment Variables
TaskMate strictly separates public client configurations from server-only secrets.

#### Public Client Configuration (`supabase-config.js`):
The frontend configuration is located in [supabase-config.js](supabase-config.js). It uses public credentials that are safe for browser exposure:
```javascript
const SUPABASE_URL = 'https://tyapfcjbwlnkvypdkekw.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_sc9ZKXUcsTyutHyM0lGlfw_OXWxafs7';
```

#### Server-Only Secret Configuration (`.env`):
1. In the project root, copy `.env.example` to create a `.env` file:
   ```bash
   cp .env.example .env
   ```
   *(On Windows PowerShell: `Copy-Item .env.example .env`)*
2. In your Supabase Dashboard, click on the **Settings** icon (gear icon at the bottom of the left sidebar) -> **API**.
3. Under **Project API keys**, locate the **`service_role`** key (marked with a red warning badge `secret`).
4. Click **Reveal** and copy its value.
5. Open your `.env` file and paste the service role key:
   ```env
   PORT=3000
   NODE_ENV=development
   SUPABASE_URL=https://tyapfcjbwlnkvypdkekw.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJh...your_service_role_key_here...
   SESSION_SECRET=a_random_32_character_string_for_signing_sessions
   ```

> [!WARNING]
> **CRITICAL SECURITY RULE**: Never commit `.env` or expose `SUPABASE_SERVICE_ROLE_KEY` in HTML, browser JavaScript, public repositories, or client-side bundles. The `.gitignore` file already excludes `.env`.

---

## 🚀 Running the Project Locally

### Prerequisites
- Node.js (v18 or higher recommended; v26 tested and confirmed).
- No external npm packages required — runs with native Node.js zero-dependency modules!

### Start the Server
From the project folder, run:
```bash
npm start
# Or directly:
node server.js
```

You will see:
```text
=======================================================
 TaskMate Pro Server running at http://localhost:3000
 Environment: development
 Supabase URL: https://tyapfcjbwlnkvypdkekw.supabase.co
 Service Role Key: Configured [Private]
=======================================================
```

Open your browser and navigate to:
**`http://localhost:3000`**

---

## 🧪 Testing and Verification

TaskMate Pro includes an automated test suite covering all 14 required validation scenarios.

### Running Automated Tests
Run the test runner:
```bash
npm test
# Or:
node test.js
```

The test suite validates:
1. **Application Assets**: `index.html`, `style.css`, `script.js`, and `supabase-config.js` load with HTTP 200.
2. **Frontend Secret Audit**: Zero service-role keys or passwords exist in any client files.
3. **Session Cookie Security**: Generates random `HttpOnly`, `SameSite=Strict` cookies.
4. **Input Validation**: Blank/whitespace titles or titles > 160 characters are rejected with HTTP 400.
5. **Direct REST API Access**: Confirms that direct queries via `https://.../rest/v1/tasks` using the publishable key cannot bypass RLS.
6. **Database Diagnostics**: Friendly, actionable error messages when the database or keys are unconfigured.
7. **Live CRUD Verification**: Task creation, persistence across refresh, editing, completion toggle, deletion, clear-completed, and multi-browser session isolation.

### Manual Verification Checklist
1. **Create Task**: Type a focus goal in the input field, select priority/category, and press <kbd>Enter</kbd> (or click **Add Task**). Verify the task is saved to Supabase and appears in the list.
2. **Persistence**: Refresh the browser page (<kbd>F5</kbd> / <kbd>Ctrl+R</kbd>). Confirm your task remains intact.
3. **Toggle Completion**: Click the checkbox on any task. Notice the celebratory confetti burst and updated productivity counters. Click again to restore it to active.
4. **Edit Task**: Click the pencil icon on any task, modify the text, and press <kbd>Enter</kbd>. Confirm the title is updated in the database.
5. **Filter & Sort**: Test switching between **All**, **Active**, and **Completed** filter tabs, and sort by **Newest**, **Oldest**, **High Priority**, or **Alphabetical**.
6. **Clear Completed**: Click **Clear Completed**. Verify only completed tasks owned by your current browser are deleted.
7. **Isolation Test**: Open an Incognito / Private window and visit `http://localhost:3000`. Verify that the Incognito session has an independent task list and cannot see or modify your primary session's tasks.
8. **Error Handling**: If the database is disconnected or `.env` key is absent, verify that the UI displays the **Database Connection Notice** banner with a **Retry Connection** button and a red sync indicator in the footer.

---

## 📁 Project File Structure

```text
To-do list/
├── .env.example         # Template for server-only environment variables
├── .gitignore           # Safeguard preventing .env & secrets from git tracking
├── index.html           # Accessible semantic markup, glassmorphism UI & modal dialogs
├── package.json         # Project metadata and test/start scripts
├── README.md            # Complete documentation, setup guide & test instructions
├── script.js            # Frontend controller, optimistic UI, search, confetti & API sync
├── server.js            # Node.js backend server, HttpOnly session engine & Supabase bridge
├── style.css            # Responsive design tokens, glassmorphism, animations & themes
├── supabase-config.js   # Centralized public-client Supabase configuration
└── supabase-schema.sql  # SQL setup file with tasks table, triggers, indexes & RLS
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Description |
| --- | --- |
| <kbd>/</kbd> | Focus task input from anywhere |
| <kbd>Enter</kbd> | Submit new task / Save edited task |
| <kbd>Esc</kbd> | Cancel inline editing / Close shortcuts modal |
| <kbd>Alt</kbd> + <kbd>T</kbd> | Toggle between Dark and Light Mode |
| <kbd>?</kbd> | Open Keyboard Shortcuts cheat-sheet modal |

---

## 📄 License

This project is licensed under the MIT License.
