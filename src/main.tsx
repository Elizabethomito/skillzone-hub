import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Service worker is registered by index.html on 'load'.
// After the app mounts we tell the SW about the current JWT.
import { sendTokenToSW } from "./lib/sw";
window.addEventListener("load", () => sendTokenToSW(localStorage.getItem("skillzone_jwt")));

createRoot(document.getElementById("root")!).render(<App />);
