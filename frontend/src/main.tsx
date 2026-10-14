import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Suppress Chrome extension and external script runtime noise (runtime.lastError, CSP evaluation from content scripts)
const isExtensionNoise = (msg?: string, src?: string): boolean => {
  const m = String(msg || '');
  const s = String(src || '');
  return (
    s.includes('chrome-extension://') ||
    s.includes('content.js') ||
    m.includes('A listener indicated an asynchronous response') ||
    m.includes('message channel closed') ||
    m.includes('runtime.lastError') ||
    m.includes('unsafe-eval') ||
    m.includes('Content Security Policy') ||
    m.includes('Evaluating a string as JavaScript violates')
  );
};

window.addEventListener('securitypolicyviolation', (event) => {
  if (
    (event.sourceFile && event.sourceFile.includes('chrome-extension://')) ||
    (event.blockedURI && event.blockedURI.includes('chrome-extension://')) ||
    isExtensionNoise(event.violatedDirective, event.sourceFile)
  ) {
    event.stopPropagation();
  }
}, true);

window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message || String(event.reason || '');
  if (isExtensionNoise(msg)) {
    event.preventDefault();
    event.stopPropagation();
  }
}, true);

window.addEventListener('error', (event) => {
  const msg = event.message || String(event.error || '');
  if (isExtensionNoise(msg, event.filename)) {
    event.preventDefault();
    event.stopPropagation();
  }
}, true);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
