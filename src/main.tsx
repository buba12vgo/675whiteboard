import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";
import "@fontsource/outfit/700.css";
import "@fontsource/fraunces/600-italic.css";
import App from "@/App.tsx";
import "@/index.css";

if (import.meta.env.PROD) {
  registerSW({ immediate: true });
}

const stopGesture = (event: Event) => {
  event.preventDefault();
};

document.addEventListener("gesturestart", stopGesture, { passive: false });
document.addEventListener("gesturechange", stopGesture, { passive: false });
document.addEventListener(
  "wheel",
  (event) => {
    if (event.ctrlKey) event.preventDefault();
  },
  { passive: false },
);
document.addEventListener(
  "touchmove",
  (event) => {
    if (event.touches.length > 1) event.preventDefault();
  },
  { passive: false },
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
