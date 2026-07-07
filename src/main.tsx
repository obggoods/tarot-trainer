import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if (import.meta.env.DEV && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void clearDevelopmentServiceWorkers();
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

async function clearDevelopmentServiceWorkers() {
  const registrations = await navigator.serviceWorker.getRegistrations();
  if (registrations.length === 0) return;

  await Promise.all(registrations.map((registration) => registration.unregister()));

  if ("caches" in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  }

  if (sessionStorage.getItem("tarot-dev-sw-cleared") === "true") return;
  sessionStorage.setItem("tarot-dev-sw-cleared", "true");
  window.location.reload();
}
