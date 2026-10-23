# TaskMate – To-Do List Web Portal

A modern, clean, and responsive To-Do List Web Portal built with vanilla **HTML5**, **CSS3**, and **JavaScript (ES6+)**. Organize your daily tasks effortlessly with a clean, distraction-free interface.

---

## ✨ Features

- **Add New Tasks**: Quickly enter tasks using the text field or press <kbd>Enter</kbd>.
- **Empty Task Prevention**: Input validation with shake animation and inline alert prevents blank items.
- **Task Completion**: Check off items with custom animated checkboxes; completed tasks feature clean strikethrough styling.
- **Inline Task Editing**: Click the pencil icon or press <kbd>Enter</kbd> to save, or <kbd>Esc</kbd> to cancel.
- **Delete Tasks**: Remove individual items with smooth exit transitions.
- **Live Filtering**: Easily switch between **All**, **Active**, and **Completed** tasks with dynamic badge counters.
- **Real-Time Progress & Statistics**:
  - Total Tasks counter
  - Remaining (Active) counter
  - Completed counter
  - Dynamic completion percentage bar
- **Clear Completed**: One-click cleanup to remove finished tasks in bulk.
- **Persistent Storage**: All tasks automatically persist via `localStorage` across page reloads and browser sessions.
- **Contextual Empty States**: Friendly illustrations and messages tailored to each active filter tab.
- **Toast Notifications**: Subtle, accessible micro-feedback on actions (add, update, delete, clear).
- **Responsive & Accessible**:
  - Optimized for desktop, tablet, and mobile screens.
  - Semantic HTML5, ARIA labels, and keyboard-friendly navigation.
  - Press <kbd>/</kbd> anywhere to instantly focus the task input.

---

## 🎨 Design Palette

- **Primary Blue**: `#2563eb` / `#3b82f6` (Vibrant royal blue)
- **Soft Blue Tints**: `#eff6ff` / `#dbeafe`
- **Background**: Soft neutral light grey (`#f8fafc` & `#f1f5f9`)
- **Card Background**: Pure white (`#ffffff`) with subtle layered drop shadows
- **Success & Action Colors**: Emerald green (`#059669`) for completions, crimson (`#dc2626`) for deletions

---

## 🚀 How to Run Locally

Because TaskMate is built with pure web standards (HTML, CSS, JS), **no build step, package manager, or backend server is required**.

### Option 1: Double-click to Open
1. Open the project folder in your File Explorer:
   `c:\Users\Dell\OneDrive\Desktop\Payuu Git\To-do list`
2. Double-click **`index.html`** to launch it in any modern web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, Brave, Safari, etc.).

### Option 2: Run with a Local Web Server
If you prefer running through `http://localhost`:

#### Using Node.js:
```bash
npx serve .
# or
npx http-server .
```
Then visit `http://localhost:3000` or `http://localhost:8080`.

#### Using Python (if installed):
```bash
python -m http.server 8000
```
Then visit `http://localhost:8000`.

---

## 📂 Project Structure

```text
To-do list/
├── index.html     # Semantic markup, SVG icons, accessibility attributes
├── style.css      # Design system, responsive layout, animations, variables
├── script.js      # CRUD operations, filters, localStorage, keyboard navigation
└── README.md      # Documentation and quick start guide
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| --- | --- |
| <kbd>Enter</kbd> (in input) | Add new task |
| <kbd>Enter</kbd> (in edit mode) | Save edited task |
| <kbd>Esc</kbd> (in edit mode) | Cancel editing |
| <kbd>/</kbd> (anywhere) | Focus task input field |
