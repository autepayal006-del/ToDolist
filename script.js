/**
 * TaskMate Pro – Next-Gen Task & Productivity Portal
 * High-Level GUI & Core Application Logic
 * 
 * Features:
 * - Theme Engine (Dark & Light Mode with localStorage persistence)
 * - Canvas Confetti Physics Celebration Engine
 * - Full Task CRUD with Priority (High, Med, Low) & Categories (Work, Personal, Study, Goals)
 * - Live Instant Search with real-time matching
 * - Multi-criteria Sorting (Newest, Oldest, Priority, Alphabetical)
 * - Segmented Filter Tabs (All, Active, Completed) with dynamic badges
 * - Productivity Metrics & Efficiency Gauge
 * - Interactive Keyboard Shortcuts Modal & Global Keybindings
 * - Safe LocalStorage Persistence with starter demo data
 * - Accessible ARIA attributes & micro-toast feedback
 */

(function () {
  'use strict';

  // --- Storage Keys ---
  const STORAGE_KEY = 'taskmate_pro_tasks_v2';
  const THEME_STORAGE_KEY = 'taskmate_theme_mode';

  // --- State Variables ---
  let tasks = [];
  let currentFilter = 'all'; // 'all' | 'active' | 'completed'
  let searchQuery = '';
  let sortBy = 'newest'; // 'newest' | 'oldest' | 'priority' | 'alphabetical'
  let editingTaskId = null;

  // --- DOM Elements ---
  const htmlRoot = document.documentElement;
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const shortcutsBtn = document.getElementById('shortcutsBtn');
  const shortcutsModal = document.getElementById('shortcutsModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const currentDateText = document.getElementById('currentDateText');

  // Input & Form Elements
  const taskForm = document.getElementById('taskForm');
  const taskInput = document.getElementById('taskInput');
  const clearInputBtn = document.getElementById('clearInputBtn');
  const inputFeedback = document.getElementById('inputFeedback');
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');

  // Task List & Empty State
  const taskList = document.getElementById('taskList');
  const emptyState = document.getElementById('emptyState');
  const emptyTitle = document.getElementById('emptyTitle');
  const emptySubtitle = document.getElementById('emptySubtitle');
  const emptyIcon = document.getElementById('emptyIcon');
  const clearCompletedBtn = document.getElementById('clearCompletedBtn');

  // Metric Displays
  const totalTasksCount = document.getElementById('totalTasksCount');
  const activeTasksCount = document.getElementById('activeTasksCount');
  const completedTasksCount = document.getElementById('completedTasksCount');
  const progressPercentage = document.getElementById('progressPercentage');
  const progressBarFill = document.getElementById('progressBarFill');
  const progressBarTrack = document.getElementById('progressBarTrack');
  const progressCaption = document.getElementById('progressCaption');

  // Badges & Toast
  const badgeAll = document.getElementById('badgeAll');
  const badgeActive = document.getElementById('badgeActive');
  const badgeCompleted = document.getElementById('badgeCompleted');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const toastContainer = document.getElementById('toastContainer');
  const confettiCanvas = document.getElementById('confettiCanvas');

  // --- Starter Tasks for First-Time Users ---
  const DEFAULT_STARTER_TASKS = [
    {
      id: 'task_pro_1',
      text: 'Design sleek modern dashboard UI with glassmorphism',
      completed: true,
      priority: 'high',
      category: 'work',
      createdAt: Date.now() - 3600000 * 3
    },
    {
      id: 'task_pro_2',
      text: 'Review pull request & push updates to GitHub repository',
      completed: false,
      priority: 'high',
      category: 'work',
      createdAt: Date.now() - 3600000 * 2
    },
    {
      id: 'task_pro_3',
      text: 'Explore advanced vanilla JavaScript performance patterns',
      completed: false,
      priority: 'medium',
      category: 'study',
      createdAt: Date.now() - 3600000 * 1
    },
    {
      id: 'task_pro_4',
      text: 'Evening 30-minute workout & mindfulness meditation',
      completed: false,
      priority: 'low',
      category: 'personal',
      createdAt: Date.now()
    }
  ];

  // =========================================================================
  // --- 1. Theme Engine (Light / Dark Mode) ---
  // =========================================================================
  function initTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme) {
      applyTheme(savedTheme);
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(prefersDark ? 'dark' : 'light');
    }
  }

  function applyTheme(theme) {
    htmlRoot.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (e) {
      console.warn('Storage unavailable for theme preference');
    }
  }

  function toggleTheme() {
    const currentTheme = htmlRoot.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    showToast(`Switched to ${newTheme === 'dark' ? 'Dark 🌙' : 'Light ☀️'} theme`, 'info');
  }

  // =========================================================================
  // --- 2. Live Date & Time Tracker ---
  // =========================================================================
  function updateDateTime() {
    if (!currentDateText) return;
    const now = new Date();
    const options = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    currentDateText.textContent = now.toLocaleDateString(undefined, options);
  }

  // =========================================================================
  // --- 3. Confetti Particle Physics Celebration Engine ---
  // =========================================================================
  let confettiParticles = [];
  let confettiAnimationId = null;

  function triggerConfetti(particleCount = 70) {
    if (!confettiCanvas) return;
    const ctx = confettiCanvas.getContext('2d');
    const width = confettiCanvas.width = window.innerWidth;
    const height = confettiCanvas.height = window.innerHeight;

    const colors = ['#3b82f6', '#60a5fa', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

    for (let i = 0; i < particleCount; i++) {
      confettiParticles.push({
        x: width / 2 + (Math.random() - 0.5) * 300,
        y: height / 3 + (Math.random() - 0.5) * 100,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 12,
        vy: Math.random() * -12 - 4,
        gravity: 0.35,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        opacity: 1
      });
    }

    if (!confettiAnimationId) {
      runConfettiLoop(ctx);
    }
  }

  function runConfettiLoop(ctx) {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    for (let i = confettiParticles.length - 1; i >= 0; i--) {
      const p = confettiParticles[i];
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotSpeed;
      p.opacity -= 0.012;

      if (p.opacity <= 0 || p.y > confettiCanvas.height) {
        confettiParticles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.4);
      ctx.restore();
    }

    if (confettiParticles.length > 0) {
      confettiAnimationId = requestAnimationFrame(() => runConfettiLoop(ctx));
    } else {
      cancelAnimationFrame(confettiAnimationId);
      confettiAnimationId = null;
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  // =========================================================================
  // --- 4. LocalStorage Persistence ---
  // =========================================================================
  function loadTasks() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        tasks = JSON.parse(stored);
        if (!Array.isArray(tasks)) tasks = [];
      } else {
        tasks = [...DEFAULT_STARTER_TASKS];
        saveTasks();
      }
    } catch (err) {
      console.warn('LocalStorage access issue:', err);
      tasks = [...DEFAULT_STARTER_TASKS];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (err) {
      console.warn('Unable to persist tasks to localStorage:', err);
      showToast('Could not save tasks locally (Quota or private mode).', 'danger');
    }
  }

  // =========================================================================
  // --- 5. Micro-Toast Feedback System ---
  // =========================================================================
  function showToast(message, type = 'info') {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'danger') {
      iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else {
      iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 2800);
  }

  // =========================================================================
  // --- 6. Helpers & Utilities ---
  // =========================================================================
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function generateId() {
    return 'task_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
  }

  function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function getCategoryLabel(category) {
    switch (category) {
      case 'work': return '💼 Work';
      case 'personal': return '👤 Personal';
      case 'study': return '📚 Study';
      case 'goals': return '🎯 Goals';
      default: return '📝 General';
    }
  }

  // =========================================================================
  // --- 7. Validation & Feedback ---
  // =========================================================================
  function showInputError(msg) {
    inputFeedback.textContent = msg;
    inputFeedback.classList.add('visible');
    taskInput.classList.add('shake');
    taskInput.focus();

    setTimeout(() => {
      taskInput.classList.remove('shake');
    }, 450);
  }

  function clearInputError() {
    inputFeedback.textContent = '';
    inputFeedback.classList.remove('visible');
  }

  // =========================================================================
  // --- 8. Core Data Calculations & Rendering ---
  // =========================================================================
  function render() {
    updateMetrics();
    renderTasks();
  }

  function updateMetrics() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const active = total - completed;

    totalTasksCount.textContent = total;
    activeTasksCount.textContent = active;
    completedTasksCount.textContent = completed;

    badgeAll.textContent = total;
    badgeActive.textContent = active;
    badgeCompleted.textContent = completed;

    const rate = total === 0 ? 0 : Math.round((completed / total) * 100);
    progressPercentage.textContent = `${rate}%`;
    progressBarFill.style.width = `${rate}%`;
    progressBarTrack.setAttribute('aria-valuenow', rate);

    if (total === 0) {
      progressCaption.textContent = 'Add your first task to begin!';
    } else if (rate === 100) {
      progressCaption.textContent = '🏆 All tasks complete! Outstanding work!';
    } else if (rate >= 50) {
      progressCaption.textContent = '🚀 More than halfway there! Keep it up!';
    } else {
      progressCaption.textContent = '⚡ Every completed step builds momentum!';
    }

    clearCompletedBtn.disabled = completed === 0;
  }

  function getSortedAndFilteredTasks() {
    let result = tasks.slice();

    // 1. Status Filter
    if (currentFilter === 'active') {
      result = result.filter(t => !t.completed);
    } else if (currentFilter === 'completed') {
      result = result.filter(t => t.completed);
    }

    // 2. Keyword Search
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(t => 
        t.text.toLowerCase().includes(q) || 
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.priority && t.priority.toLowerCase().includes(q))
      );
    }

    // 3. Sorting
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return (b.createdAt || 0) - (a.createdAt || 0);
      } else if (sortBy === 'oldest') {
        return (a.createdAt || 0) - (b.createdAt || 0);
      } else if (sortBy === 'priority') {
        const weightA = priorityWeight[a.priority] || 1;
        const weightB = priorityWeight[b.priority] || 1;
        return weightB - weightA;
      } else if (sortBy === 'alphabetical') {
        return a.text.localeCompare(b.text);
      }
      return 0;
    });

    return result;
  }

  function renderTasks() {
    const list = getSortedAndFilteredTasks();

    if (list.length === 0) {
      taskList.innerHTML = '';
      taskList.style.display = 'none';
      emptyState.style.display = 'flex';
      renderEmptyState();
      return;
    }

    taskList.style.display = 'flex';
    emptyState.style.display = 'none';

    taskList.innerHTML = list.map(task => {
      const isEditing = task.id === editingTaskId;

      if (isEditing) {
        return `
          <li class="task-item editing" data-id="${task.id}" data-priority="${task.priority || 'low'}" role="listitem">
            <form class="task-edit-form" id="editForm_${task.id}">
              <input 
                type="text" 
                class="task-edit-input" 
                id="editInput_${task.id}" 
                value="${escapeHtml(task.text)}" 
                maxlength="160" 
                aria-label="Edit task title"
                required
              >
              <button type="submit" class="btn-edit-save" title="Save changes (Enter)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Save</span>
              </button>
              <button type="button" class="btn-edit-cancel" data-id="${task.id}" title="Cancel editing (Esc)">
                <span>Cancel</span>
              </button>
            </form>
          </li>
        `;
      }

      const priorityBadgeClass = task.priority === 'high' 
        ? 'priority-high-badge' 
        : (task.priority === 'medium' ? 'priority-med-badge' : 'priority-low-badge');

      return `
        <li class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}" data-priority="${task.priority || 'low'}" role="listitem">
          <div class="task-checkbox-wrap">
            <input 
              type="checkbox" 
              class="task-checkbox" 
              id="chk_${task.id}" 
              data-id="${task.id}" 
              ${task.completed ? 'checked' : ''} 
              aria-label="Toggle completion for '${escapeHtml(task.text)}'"
            >
            <svg class="task-checkbox-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>

          <div class="task-content" data-id="${task.id}" title="Click to toggle status">
            <div class="task-title-line">
              <span class="task-text">${escapeHtml(task.text)}</span>
            </div>
            <div class="task-meta-row">
              <span class="tag-badge">${getCategoryLabel(task.category)}</span>
              <span class="priority-badge ${priorityBadgeClass}">${(task.priority || 'low')}</span>
              <span class="task-timestamp">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                ${formatTime(task.createdAt)}
              </span>
            </div>
          </div>

          <div class="task-actions">
            <button 
              type="button" 
              class="btn-item-action btn-task-edit" 
              data-id="${task.id}" 
              title="Edit task" 
              aria-label="Edit task '${escapeHtml(task.text)}'"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button 
              type="button" 
              class="btn-item-action btn-task-delete" 
              data-id="${task.id}" 
              title="Delete task" 
              aria-label="Delete task '${escapeHtml(task.text)}'"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </li>
      `;
    }).join('');

    if (editingTaskId) {
      const editInput = document.getElementById(`editInput_${editingTaskId}`);
      if (editInput) {
        editInput.focus();
        editInput.setSelectionRange(editInput.value.length, editInput.value.length);
      }
    }
  }

  function renderEmptyState() {
    if (searchQuery.trim() !== '') {
      emptyIcon.innerHTML = `
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      `;
      emptyTitle.textContent = 'No matching tasks found';
      emptySubtitle.textContent = `No task corresponds to "${escapeHtml(searchQuery)}". Try clearing your search term.`;
    } else if (currentFilter === 'active') {
      emptyIcon.innerHTML = `
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="m9 12 2 2 4-4"></path>
        </svg>
      `;
      emptyTitle.textContent = 'All caught up!';
      emptySubtitle.textContent = 'You have zero active tasks remaining. Enjoy your accomplished day!';
    } else if (currentFilter === 'completed') {
      emptyIcon.innerHTML = `
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
      emptyTitle.textContent = 'No completed tasks yet';
      emptySubtitle.textContent = 'Check off your goals to see them logged here in your achievements.';
    } else {
      emptyIcon.innerHTML = `
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
        </svg>
      `;
      emptyTitle.textContent = 'Your task list is clean';
      emptySubtitle.textContent = 'Add a new priority task above to jumpstart your productivity!';
    }
  }

  // =========================================================================
  // --- 9. Task Action Handlers ---
  // =========================================================================
  function addTask(rawText) {
    const text = rawText.trim();
    if (!text) {
      showInputError('Please enter a task description before submitting.');
      return false;
    }

    // Read selected Priority & Category from form
    const priorityEl = document.querySelector('input[name="taskPriority"]:checked');
    const categoryEl = document.querySelector('input[name="taskCategory"]:checked');
    const priority = priorityEl ? priorityEl.value : 'low';
    const category = categoryEl ? categoryEl.value : 'work';

    const newTask = {
      id: generateId(),
      text: text,
      completed: false,
      priority: priority,
      category: category,
      createdAt: Date.now()
    };

    tasks.unshift(newTask);
    saveTasks();
    render();

    taskInput.value = '';
    clearInputBtn.classList.remove('visible');
    clearInputError();
    showToast('Task added to your dashboard!', 'success');
    return true;
  }

  function toggleTaskComplete(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    task.completed = !task.completed;
    saveTasks();
    render();

    if (task.completed) {
      showToast('Task marked as complete! 🎉', 'success');
      triggerConfetti(45);

      // Check if all tasks are complete
      if (tasks.length > 0 && tasks.every(t => t.completed)) {
        setTimeout(() => triggerConfetti(120), 200);
      }
    } else {
      showToast('Task restored to active.', 'info');
    }
  }

  function startEditingTask(id) {
    editingTaskId = id;
    render();
  }

  function cancelEditingTask() {
    editingTaskId = null;
    render();
  }

  function saveEditedTask(id, rawText) {
    const text = rawText.trim();
    if (!text) {
      showToast('Task text cannot be blank.', 'danger');
      return;
    }

    const task = tasks.find(t => t.id === id);
    if (task) {
      task.text = text;
      saveTasks();
      showToast('Task updated successfully!', 'success');
    }

    editingTaskId = null;
    render();
  }

  function deleteTask(id) {
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) return;

    const itemEl = document.querySelector(`.task-item[data-id="${id}"]`);
    if (itemEl) {
      itemEl.classList.add('removing');
      setTimeout(() => {
        tasks.splice(taskIndex, 1);
        if (editingTaskId === id) editingTaskId = null;
        saveTasks();
        render();
        showToast('Task removed.', 'info');
      }, 250);
    } else {
      tasks.splice(taskIndex, 1);
      if (editingTaskId === id) editingTaskId = null;
      saveTasks();
      render();
      showToast('Task removed.', 'info');
    }
  }

  function clearCompletedTasks() {
    const completedCount = tasks.filter(t => t.completed).length;
    if (completedCount === 0) return;

    tasks = tasks.filter(t => !t.completed);
    if (editingTaskId && !tasks.some(t => t.id === editingTaskId)) {
      editingTaskId = null;
    }

    saveTasks();
    render();
    showToast(`Cleared ${completedCount} completed task${completedCount > 1 ? 's' : ''}!`, 'info');
  }

  // =========================================================================
  // --- 10. Shortcuts Modal Controllers ---
  // =========================================================================
  function openShortcutsModal() {
    if (shortcutsModal) {
      shortcutsModal.classList.add('open');
      shortcutsModal.setAttribute('aria-hidden', 'false');
    }
  }

  function closeShortcutsModal() {
    if (shortcutsModal) {
      shortcutsModal.classList.remove('open');
      shortcutsModal.setAttribute('aria-hidden', 'true');
    }
  }

  // =========================================================================
  // --- 11. Event Listeners Setup ---
  // =========================================================================
  function setupEventListeners() {
    // Theme toggle button
    themeToggleBtn.addEventListener('click', toggleTheme);

    // Shortcuts modal open/close
    shortcutsBtn.addEventListener('click', openShortcutsModal);
    closeModalBtn.addEventListener('click', closeShortcutsModal);
    shortcutsModal.addEventListener('click', function (e) {
      if (e.target === shortcutsModal) closeShortcutsModal();
    });

    // Form submission
    taskForm.addEventListener('submit', function (e) {
      e.preventDefault();
      addTask(taskInput.value);
    });

    // Input clear button
    taskInput.addEventListener('input', function () {
      if (taskInput.value.length > 0) {
        clearInputBtn.classList.add('visible');
        clearInputError();
      } else {
        clearInputBtn.classList.remove('visible');
      }
    });

    clearInputBtn.addEventListener('click', function () {
      taskInput.value = '';
      clearInputBtn.classList.remove('visible');
      clearInputError();
      taskInput.focus();
    });

    // Instant search input
    searchInput.addEventListener('input', function () {
      searchQuery = searchInput.value;
      render();
    });

    // Sorting dropdown
    sortSelect.addEventListener('change', function () {
      sortBy = sortSelect.value;
      render();
    });

    // Filter Segmented Tabs
    tabButtons.forEach(btn => {
      btn.addEventListener('click', function () {
        tabButtons.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        this.classList.add('active');
        this.setAttribute('aria-selected', 'true');
        currentFilter = this.getAttribute('data-filter');
        render();
      });
    });

    // Clear completed button
    clearCompletedBtn.addEventListener('click', clearCompletedTasks);

    // Task list event delegation
    taskList.addEventListener('click', function (e) {
      // 1. Checkbox toggle
      const checkbox = e.target.closest('.task-checkbox');
      if (checkbox) {
        const id = checkbox.getAttribute('data-id');
        toggleTaskComplete(id);
        return;
      }

      // 2. Delete button
      const deleteBtn = e.target.closest('.btn-task-delete');
      if (deleteBtn) {
        const id = deleteBtn.getAttribute('data-id');
        deleteTask(id);
        return;
      }

      // 3. Edit button
      const editBtn = e.target.closest('.btn-task-edit');
      if (editBtn) {
        const id = editBtn.getAttribute('data-id');
        startEditingTask(id);
        return;
      }

      // 4. Cancel edit button
      const cancelBtn = e.target.closest('.btn-edit-cancel');
      if (cancelBtn) {
        cancelEditingTask();
        return;
      }

      // 5. Clicking task content directly to toggle completion
      const content = e.target.closest('.task-content');
      if (content && !editingTaskId) {
        const id = content.getAttribute('data-id');
        toggleTaskComplete(id);
        return;
      }
    });

    // Inline edit form submission
    taskList.addEventListener('submit', function (e) {
      const editForm = e.target.closest('.task-edit-form');
      if (editForm) {
        e.preventDefault();
        const taskId = editForm.id.replace('editForm_', '');
        const editInput = document.getElementById(`editInput_${taskId}`);
        if (editInput) {
          saveEditedTask(taskId, editInput.value);
        }
      }
    });

    // Global Keyboard Shortcuts
    document.addEventListener('keydown', function (e) {
      // Escape closes modal or cancels active editing
      if (e.key === 'Escape') {
        if (shortcutsModal.classList.contains('open')) {
          closeShortcutsModal();
          return;
        }
        if (editingTaskId) {
          cancelEditingTask();
          return;
        }
      }

      // '?' opens shortcuts modal when not in input
      if (e.key === '?' && document.activeElement !== taskInput && document.activeElement !== searchInput && !editingTaskId) {
        e.preventDefault();
        openShortcutsModal();
        return;
      }

      // '/' focuses search or task input
      if (e.key === '/' && document.activeElement !== taskInput && document.activeElement !== searchInput && !editingTaskId) {
        e.preventDefault();
        taskInput.focus();
        return;
      }

      // Alt + T toggles theme
      if (e.altKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        toggleTheme();
      }
    });

    // Window resize handler for canvas
    window.addEventListener('resize', function () {
      if (confettiCanvas) {
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
      }
    });
  }

  // =========================================================================
  // --- 12. App Initialization ---
  // =========================================================================
  function init() {
    initTheme();
    updateDateTime();
    setInterval(updateDateTime, 30000); // Refresh time every 30s
    loadTasks();
    setupEventListeners();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
