/**
 * TaskMate Pro — Supabase Centralized Configuration
 * 
 * Provides public client-safe configuration for Supabase integration.
 * Notice: The Supabase Publishable/Anon key is designed for public client use,
 * but it does NOT provide privileged access. All task mutations and private data
 * ownership are guarded by Row Level Security (RLS) and the verified server API.
 */

(function (window) {
  'use strict';

  // Public Supabase project credentials (safe for browser exposure)
  const SUPABASE_URL = 'https://tyapfcjbwlnkvypdkekw.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_sc9ZKXUcsTyutHyM0lGlfw_OXWxafs7';

  // Public Configuration Object
  const TaskMateSupabase = {
    url: SUPABASE_URL,
    publishableKey: SUPABASE_PUBLISHABLE_KEY,
    client: null,
    isInitialized: false,

    /**
     * Initialize the official Supabase client using window.supabase (loaded via CDN)
     */
    init: function () {
      if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
        try {
          this.client = window.supabase.createClient(this.url, this.publishableKey, {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: false
            }
          });
          this.isInitialized = true;
          // Public reference for developer inspection
          window.supabaseClient = this.client;
          console.info('TaskMate: Supabase public client successfully initialized.');
        } catch (err) {
          console.error('TaskMate: Failed to initialize Supabase client:', err);
        }
      } else {
        console.warn('TaskMate: Official Supabase CDN script not loaded or unavailable.');
      }
      return this;
    },

    /**
     * Check connection status to Supabase project
     */
    checkConnection: async function () {
      try {
        const response = await fetch(`${this.url}/rest/v1/`, {
          method: 'GET',
          headers: {
            'apikey': this.publishableKey,
            'Authorization': `Bearer ${this.publishableKey}`
          }
        });
        return {
          ok: response.ok || response.status === 404, // 404 on root rest endpoint still confirms server presence
          status: response.status
        };
      } catch (err) {
        return {
          ok: false,
          error: err.message
        };
      }
    }
  };

  // Expose configuration globally
  window.TASKMATE_SUPABASE = TaskMateSupabase;

  // Auto-initialize when DOM / script is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => TaskMateSupabase.init());
  } else {
    TaskMateSupabase.init();
  }
})(window);
