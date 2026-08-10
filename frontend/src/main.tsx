import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Suppress Chrome extension message channel disconnect errors (runtime.lastError)
window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message || String(event.reason || '');
  if (
    msg.includes('A listener indicated an asynchronous response') ||
    msg.includes('message channel closed') ||
    msg.includes('runtime.lastError')
  ) {
    event.preventDefault();
    event.stopPropagation();
  }
});

window.addEventListener('error', (event) => {
  const msg = event.message || String(event.error || '');
  if (
    msg.includes('A listener indicated an asynchronous response') ||
    msg.includes('message channel closed') ||
    msg.includes('runtime.lastError')
  ) {
    event.preventDefault();
    event.stopPropagation();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
