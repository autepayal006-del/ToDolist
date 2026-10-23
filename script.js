/**
 * TaskMate – To-Do List Web Portal
 * Core JavaScript Logic
 * 
 * Features:
 * - Full CRUD: Add, Read, Update, Delete tasks
 * - Task completion toggle with animated feedback
 * - Inline task editing with Enter to save & Esc to cancel
 * - Task filters: All, Active, Completed with live count badges
 * - Safe LocalStorage persistence
 * - Real-time progress bar & task counters
 * - Empty state feedback tailored to current filter
 * - Toast notification feedback
 * - Keyboard navigation & accessible attributes
 */

(function () {
  'use strict';

  // --- Storage Key & State ---
  const STORAGE_KEY = 'taskmate_tasks_v1';

  let tasks = [];
  let currentFilter = 'all'; // 'all' | 'active' | 'completed'
  let editingTaskId = null;

  // --- DOM Elements ---
  const taskForm = document.getElementById('taskForm');
  const taskInput = document.getElementById('taskInput');
  const clearInputBtn = document.getElementById('clearInputBtn');
  const inputFeedback = document.getElementById('inputFeedback');
  const taskList = document.getElementById('taskList');
  const emptyState = document.getElementById('emptyState');
  const emptyTitle = document.getElementById('emptyTitle');
  const emptySubtitle = document.getElementById('emptySubtitle');
  const emptyIcon = document.getElementById('emptyIcon');
  const clearCompletedBtn = document.getElementById('clearCompletedBtn');
  
  // Counters & Badges
  const totalTasksCount = document.getElementById('totalTasksCount');
  const activeTasksCount = document.getElementById('activeTasksCount');
  const completedTasksCount = document.getElementById('completedTasksCount');
  const badgeAll = document.getElementById('badgeAll');
  const badgeActive = document.getElementById('badgeActive');
  const badgeCompleted = document.getElementById('badgeCompleted');
  const progressBarFill = document.getElementById('progressBarFill');
  const progressPercentage = document.getElementById('progressPercentage');
  const progressBarTrack = document.getElementById('progressBarTrack');

  // Filter Buttons
  const filterButtons = document.querySelectorAll('.filter-btn');

  // Header Elements
  const currentDateBadge = document.getElementById('currentDateBadge');
  const toastContainer = document.getElementById('toastContainer');

  // --- Starter Tasks for First-Time Users ---
  const DEFAULT_STARTER_TASKS = [
    {
      id: 'task-1',
      text: 'Welcome to TaskMate! Plan your day with ease ✨',
      completed: false,
      createdAt: Date.now() - 3600000 * 2
    },
    {
      id: 'task-2',
      text: 'Click the checkbox on the left to mark a task as completed',
      completed: true,
      createdAt: Date.now() - 3600000 * 1
    },
    {
      id: 'task-3',
      text: 'Hover and click the pencil icon to edit any task',
      completed: false,
      createdAt: Date.now()
    }
  ];

  // --- Storage Helpers (Safe handling) ---
  function loadTasks() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        tasks = JSON.parse(stored);
        if (!Array.isArray(tasks)) {
          tasks = [];
        }
      } else {
        // First visit: initialize with helpful starter tasks
        tasks = [...DEFAULT_STARTER_TASKS];
        saveTasks();
      }
    } catch (err) {
      console.warn('LocalStorage is not accessible or corrupted:', err);
      tasks = [...DEFAULT_STARTER_TASKS];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (err) {
      console.warn('Failed to save to localStorage:', err);
      showToast('Could not save tasks locally (quota exceeded or private mode).', 'danger');
    }
  }

  // --- Toast Notifications ---
  function showToast(message, type = 'info') {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Icon based on type
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
      if (toast.parentNode) {
        toast.remove();
      }
    }, 2800);
  }

  // --- Utility Functions ---
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function generateId() {
    return 'task_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
  }

  function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function updateCurrentDate() {
    if (!currentDateBadge) return;
    const now = new Date();
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    currentDateBadge.textContent = now.toLocaleDateString(undefined, options);
  }

  // --- Input Validation & Feedback ---
  function showInputError(message) {
    inputFeedback.textContent = message;
    inputFeedback.classList.add('visible');
    taskInput.classList.add('shake');
    taskInput.focus();

    setTimeout(() => {
      taskInput.classList.remove('shake');
    }, 500);
  }

  function clearInputError() {
    inputFeedback.textContent = '';
    inputFeedback.classList.remove('visible');
  }

  // --- Render Core ---
  function render() {
    updateCounters();
    renderTaskList();
  }

  function updateCounters() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const active = total - completed;

    // Numerical stats
    totalTasksCount.textContent = total;
    activeTasksCount.textContent = active;
    completedTasksCount.textContent = completed;

    // Badges on filter buttons
    badgeAll.textContent = total;
    badgeActive.textContent = active;
    badgeCompleted.textContent = completed;

    // Progress bar calculation
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    progressBarFill.style.width = `${percentage}%`;
    progressPercentage.textContent = `${percentage}%`;
    progressBarTrack.setAttribute('aria-valuenow', percentage);

    // Clear completed button state
    clearCompletedBtn.disabled = completed === 0;
  }

  function renderTaskList() {
    // Filter tasks
    const filteredTasks = tasks.filter(task => {
      if (currentFilter === 'active') return !task.completed;
      if (currentFilter === 'completed') return task.completed;
      return true;
    });

    // Check empty state
    if (filteredTasks.length === 0) {
      taskList.innerHTML = '';
      taskList.style.display = 'none';
      emptyState.style.display = 'flex';
      updateEmptyStateMessage();
      return;
    }

    taskList.style.display = 'flex';
    emptyState.style.display = 'none';

    // Build task items
    taskList.innerHTML = filteredTasks.map(task => {
      const isEditing = task.id === editingTaskId;

      if (isEditing) {
        return `
          <li class="task-item editing" data-id="${task.id}" role="listitem">
            <form class="task-edit-form" id="editForm_${task.id}">
              <input 
                type="text" 
                class="task-edit-input" 
                id="editInput_${task.id}" 
                value="${escapeHtml(task.text)}" 
                maxlength="150" 
                aria-label="Edit task description"
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

      return `
        <li class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}" role="listitem">
          <div class="task-checkbox-wrap">
            <input 
              type="checkbox" 
              class="task-checkbox" 
              id="chk_${task.id}" 
              data-id="${task.id}" 
              ${task.completed ? 'checked' : ''} 
              aria-label="Mark task '${escapeHtml(task.text)}' as ${task.completed ? 'incomplete' : 'completed'}"
            >
            <svg class="task-checkbox-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>

          <div class="task-content" data-id="${task.id}" title="Click to toggle status">
            <span class="task-text">${escapeHtml(task.text)}</span>
            <div class="task-meta">
              <span class="task-time">
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
              class="btn-task-action btn-task-edit" 
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
              class="btn-task-action btn-task-delete" 
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

    // If an edit input was rendered, focus it and move cursor to end
    if (editingTaskId) {
      const editInput = document.getElementById(`editInput_${editingTaskId}`);
      if (editInput) {
        editInput.focus();
        editInput.setSelectionRange(editInput.value.length, editInput.value.length);
      }
    }
  }

  function updateEmptyStateMessage() {
    if (currentFilter === 'active') {
      emptyIcon.innerHTML = `
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="m9 12 2 2 4-4"></path>
        </svg>
      `;
      emptyTitle.textContent = 'All caught up!';
      emptySubtitle.textContent = 'You have completed all active tasks. Great job!';
    } else if (currentFilter === 'completed') {
      emptyIcon.innerHTML = `
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      `;
      emptyTitle.textContent = 'No completed tasks';
      emptySubtitle.textContent = 'Finish a task to see it listed here in your accomplishments.';
    } else {
      emptyIcon.innerHTML = `
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="12" y1="18" x2="12" y2="12"></line>
          <line x1="9" y1="15" x2="15" y2="15"></line>
        </svg>
      `;
      emptyTitle.textContent = 'No tasks yet';
      emptySubtitle.textContent = 'Type a task in the box above and press Enter or Add Task!';
    }
  }

  // --- Task Action Handlers ---
  function addTask(rawText) {
    const text = rawText.trim();
    if (!text) {
      showInputError('Please enter a task description before adding.');
      return false;
    }

    const newTask = {
      id: generateId(),
      text: text,
      completed: false,
      createdAt: Date.now()
    };

    tasks.unshift(newTask);
    saveTasks();
    render();

    // Reset input
    taskInput.value = '';
    clearInputBtn.classList.remove('visible');
    clearInputError();
    showToast('Task added successfully!', 'success');
    return true;
  }

  function toggleTaskComplete(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    task.completed = !task.completed;
    saveTasks();
    render();

    if (task.completed) {
      showToast('Task marked as completed! 🎉', 'success');
    } else {
      showToast('Task marked as active.', 'info');
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
      showToast('Task description cannot be empty.', 'danger');
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
        showToast('Task deleted.', 'info');
      }, 240);
    } else {
      tasks.splice(taskIndex, 1);
      if (editingTaskId === id) editingTaskId = null;
      saveTasks();
      render();
      showToast('Task deleted.', 'info');
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

  // --- Event Listeners ---
  function setupEventListeners() {
    // Add task form submission (Handles button click and Enter key)
    taskForm.addEventListener('submit', function (e) {
      e.preventDefault();
      addTask(taskInput.value);
    });

    // Input changes (clear button visibility & reset feedback)
    taskInput.addEventListener('input', function () {
      if (taskInput.value.length > 0) {
        clearInputBtn.classList.add('visible');
        clearInputError();
      } else {
        clearInputBtn.classList.remove('visible');
      }
    });

    // Clear input button
    clearInputBtn.addEventListener('click', function () {
      taskInput.value = '';
      clearInputBtn.classList.remove('visible');
      clearInputError();
      taskInput.focus();
    });

    // Filter switching
    filterButtons.forEach(btn => {
      btn.addEventListener('click', function () {
        filterButtons.forEach(b => {
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
    clearCompletedBtn.addEventListener('click', function () {
      clearCompletedTasks();
    });

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

      // 5. Clicking task text content to toggle complete
      const content = e.target.closest('.task-content');
      if (content && !editingTaskId) {
        const id = content.getAttribute('data-id');
        toggleTaskComplete(id);
        return;
      }
    });

    // Handle Edit form submission & Keyboard shortcuts inside task list
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

    taskList.addEventListener('keydown', function (e) {
      // Escape key cancels active editing
      if (e.key === 'Escape' && editingTaskId) {
        cancelEditingTask();
      }
    });

    // Global keyboard shortcut: '/' focuses the new task input
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && document.activeElement !== taskInput && !editingTaskId) {
        e.preventDefault();
        taskInput.focus();
      }
    });
  }

  // --- Initialization ---
  function init() {
    updateCurrentDate();
    loadTasks();
    setupEventListeners();
    render();
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
