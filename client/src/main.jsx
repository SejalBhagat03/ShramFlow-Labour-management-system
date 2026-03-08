/**
 * @file main.jsx
 * @description Entry point for the React application.
 * Mounts the App component to the DOM.
 */

import { createRoot } from "react-dom/client";
import App from "./App";
import "./assets/index.css";
import "@/lib/i18n";

createRoot(document.getElementById("root")).render(<App />);
