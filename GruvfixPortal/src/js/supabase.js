/**
 * @file supabase.js
 * @description Initializes Supabase client with project URL and Anon public key.
 */
const SUPABASE_URL = "https://wrknmeifvyowuifompms.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indya25tZWlmdnlvd3VpZm9tcG1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NzIyMjUsImV4cCI6MjA5ODE0ODIyNX0.Qc0_4K5tqGwlZVxVu3LGFUoGxsSt4tckFNDYxgKXNOM";

window.supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

if (!window.supabaseClient) {
    console.error("Supabase SDK not loaded or failed to initialize.");
} else {
    console.log("Supabase Client initialized successfully.");
}
