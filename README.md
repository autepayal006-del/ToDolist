# TaskMate Pro – Next-Gen Task & Productivity Portal

**TaskMate Pro** is an ultra-modern, high-level GUI To-Do List and Productivity Web Portal engineered using pure vanilla **HTML5**, **CSS3**, and **JavaScript (ES6+)**. It combines sleek glassmorphism, dynamic ambient lighting, and intelligent task organization into a responsive application.

---

## 🌟 High-Level GUI & Key Features

### 🎨 Visuals & Aesthetics
- **Adaptive Dark & Light Theme**: Toggle effortlessly between a crisp, luminous Light Mode and a deep cyber-luxe Dark Mode. Your theme preference persists automatically.
- **Glassmorphism & Depth**: Multi-layered frosted glass panels (`backdrop-filter: blur(20px)`), iridescent translucent borders, and subtle layered drop shadows.
- **Dynamic Ambient Aura**: Floating, animated gradient orbs create depth and visual motion.
- **Confetti Celebration Engine**: Canvas particle physics engine triggers celebratory bursts whenever tasks are completed or 100% efficiency is achieved.
- **Interactive Micro-Animations**: Smooth scale transitions, checkbox bounce animations, list item enter/exit choreographies, and feedback shake on invalid input.

### ⚡ Smart Productivity Features
- **Priority Tagging**: Assign urgency with colored priority badges:
  - 🔴 **High Priority**
  - 🟡 **Medium Priority**
  - 🟢 **Low Priority**
- **Category Tags**: Organize tasks into structured categories:
  - 💼 **Work**
  - 👤 **Personal**
  - 📚 **Study**
  - 🎯 **Goals**
- **Live Instant Search**: Filter tasks in real time by keyword matching task titles, categories, or priorities.
- **Multi-Criteria Sorting**: Sort your task board instantly:
  - 🕒 Newest First
  - ⏳ Oldest First
  - 🔥 High Priority First
  - 🔤 Alphabetical (A → Z)
- **Productivity Metrics Dashboard**:
  - Total Tasks counter
  - Pending / In Progress counter
  - Completed counter
  - Real-time Efficiency Progress Bar with motivational status captions
- **Segmented Filter Tabs**: Quick-switch between **All**, **Active**, and **Completed** tasks with dynamic count badges.
- **Inline Editing**: Click the pencil icon to modify any task inline; save with <kbd>Enter</kbd> or dismiss with <kbd>Esc</kbd>.
- **One-Click Clear Completed**: Clean up your workspace by removing all completed tasks in one click.
- **Zero-Dependency Local Persistence**: Robust `localStorage` integration ensures zero data loss across browser reloads or device restarts.

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

## 🚀 Running Locally

TaskMate Pro is built with standard web technologies and requires no bundlers, compilation, or third-party servers.

### Method 1: Direct File Launch
Double-click [index.html](file:///c:/Users/Dell/OneDrive/Desktop/Payuu%20Git/To-do%20list/index.html) in your file explorer to open it in any modern browser (Chrome, Edge, Firefox, Brave, Safari).

### Method 2: Local HTTP Server
If you are running a local dev server:
```bash
npx serve .
# Or via Node.js:
node -e "const http=require('http'),fs=require('fs'),p=require('path');http.createServer((q,s)=>{let f=p.join(__dirname,q.url==='/'?'index.html':q.url);fs.readFile(f,(e,c)=>{if(e){s.writeHead(404);s.end('Not found');}else{let x=p.extname(f);s.writeHead(200,{'Content-Type':{'.html':'text/html','.css':'text/css','.js':'text/javascript'}[x]||'text/plain'});s.end(c);}});}).listen(8080,()=>console.log('http://localhost:8080'));"
```
Then navigate to **`http://localhost:8080`**.

---

## 📂 Repository Structure

```text
To-do list/
├── index.html     # Semantic structure, accessible markup, SVG icons & modal dialogs
├── style.css      # Design tokens, themes, glassmorphism, responsive styles & animations
├── script.js      # App controller, theme engine, confetti physics, search & persistence
└── README.md      # Detailed documentation, shortcuts, and setup guide
```
