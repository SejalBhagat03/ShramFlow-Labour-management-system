/**
 * @file main.jsx
 * @description Entry point for the React application.
 * Mounts the App component to the DOM.
 */

import { createRoot } from "react-dom/client";
import App from "./App";
import "./assets/index.css";
import "@/features/ai/services/i18n/i18n";

// Kill all existing service workers in dev to stop console flooding
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => registration.unregister());
  });
}

createRoot(document.getElementById("root")).render(<App />);
