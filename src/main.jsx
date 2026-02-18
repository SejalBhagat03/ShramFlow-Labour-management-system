/**
 * @file main.jsx
 * @description Entry point for the React application.
 * Mounts the App component to the DOM.
 */

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")).render(<App />);
