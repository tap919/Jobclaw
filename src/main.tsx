import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Handle OAuth dynamic popup callback message transmission securely
if (window.location.hash && window.opener) {
  const params = new URLSearchParams(window.location.hash.substring(1));
  if (params.has("access_token")) {
    try {
      window.opener.postMessage(
        { type: "GOOGLE_OAUTH_HASH", hash: window.location.hash },
        window.location.origin
      );
    } catch (e) {
      console.error("Popup message routing failure:", e);
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
