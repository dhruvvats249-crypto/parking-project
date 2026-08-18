import React, { useEffect, useState, useRef } from "react";

/**
 * PWA Install Prompt Component
 * Listens for the beforeinstallprompt event and shows an "Add to Home Screen" banner
 * when the app is installable but not yet installed.
 */
export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const dismissedRef = useRef(false);

  // Check if already installed (standalone mode or previously dismissed)
  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const wasDismissed = localStorage.getItem("pwa-install-dismissed") === "true";
    dismissedRef.current = wasDismissed;
    setIsInstalled(isStandalone);
    setDismissed(wasDismissed);
  }, []);

  useEffect(() => {
    if (isInstalled || dismissed) return;

    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Show our custom install banner
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      // Clear the deferred prompt
      setDeferredPrompt(null);
      setShowPrompt(false);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [isInstalled, dismissed]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the native install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    // The deferred prompt can only be used once
    setDeferredPrompt(null);
    setShowPrompt(false);

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    dismissedRef.current = true;
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  // Don't render if installed, dismissed, or no prompt available
  if (isInstalled || dismissed || !deferredPrompt || !showPrompt) {
    return null;
  }

  return (
    <div className="pwa-install-banner" role="dialog" aria-label="Install ParkSpot app">
      <div className="pwa-install-content">
        <div className="pwa-install-icon" aria-hidden="true">🅿️</div>
        <div className="pwa-install-text">
          <strong>Install ParkSpot</strong>
          <span>Add to home screen for quick access to parking</span>
        </div>
        <div className="pwa-install-actions">
          <button className="btn btn-ghost pwa-install-dismiss" onClick={handleDismiss} aria-label="Dismiss">
            ✕
          </button>
          <button className="btn btn-primary" onClick={handleInstall}>
            Install
          </button>
        </div>
      </div>
    </div>
  );
}