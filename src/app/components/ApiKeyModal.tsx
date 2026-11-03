"use client";

import { useEffect, useState } from "react";

export function ApiKeyModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [inputVal, setInputVal] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testState, setTestState] = useState<"idle" | "testing" | "valid" | "invalid">("idle");
  const [testMessage, setTestMessage] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("gemini_api_key") || "";
    setApiKey(saved);
    setInputVal(saved);

    const onKeyChange = () => {
      const updated = localStorage.getItem("gemini_api_key") || "";
      setApiKey(updated);
      setInputVal(updated);
    };

    window.addEventListener("apiKeyChanged", onKeyChange);
    return () => window.removeEventListener("apiKeyChanged", onKeyChange);
  }, []);

  function openModal() {
    setInputVal(apiKey);
    setTestState("idle");
    setTestMessage(null);
    setIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
    setTestState("idle");
    setTestMessage(null);
  }

  function handleSave() {
    const trimmed = inputVal.trim();
    if (trimmed) {
      localStorage.setItem("gemini_api_key", trimmed);
    } else {
      localStorage.removeItem("gemini_api_key");
    }
    setApiKey(trimmed);
    window.dispatchEvent(new Event("apiKeyChanged"));
    closeModal();
  }

  function handleClear() {
    localStorage.removeItem("gemini_api_key");
    setApiKey("");
    setInputVal("");
    window.dispatchEvent(new Event("apiKeyChanged"));
    closeModal();
  }

  async function handleTest() {
    const trimmed = inputVal.trim();
    if (!trimmed) {
      setTestState("invalid");
      setTestMessage("Please enter an API key first.");
      return;
    }

    setTestState("testing");
    setTestMessage(null);

    try {
      const res = await fetch("/api/key/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: trimmed }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestState("valid");
        setTestMessage("API key is valid and connected to Gemini!");
      } else {
        setTestState("invalid");
        setTestMessage(data.error || "Invalid API key");
      }
    } catch (err) {
      setTestState("invalid");
      setTestMessage(err instanceof Error ? err.message : "Connection failed");
    }
  }

  const maskedKey = apiKey
    ? `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`
    : "";

  return (
    <>
      {/* Navbar trigger pill */}
      <button
        type="button"
        onClick={openModal}
        className="flex items-center gap-2 rounded-full border border-black/15 bg-white/60 px-3 py-1.5 text-xs font-medium text-[var(--ink)] shadow-sm backdrop-blur-sm transition hover:bg-white/90"
        title={apiKey ? "BYOK Active: Custom Gemini API key set" : "No API key set: Running in Mock Mode"}
      >
        <span
          className={`h-2 w-2 rounded-full ${
            apiKey ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" : "bg-black/30"
          }`}
        />
        <span>
          {apiKey ? `BYOK: ${maskedKey}` : "Set API Key (BYOK)"}
        </span>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-xl border border-black/15 bg-[var(--bg)] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-serif text-lg font-semibold text-[var(--brand)]">
                  Bring Your Own Key (BYOK)
                </h3>
                <p className="mt-1 text-xs text-black/60">
                  Use your own Gemini API key for real image and video generation. The key stays in your browser.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-black/40 hover:text-black"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--ink)] mb-1">
                  Gemini API Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={inputVal}
                    onChange={(e) => {
                      setInputVal(e.target.value);
                      if (testState !== "idle") setTestState("idle");
                    }}
                    placeholder="AIzaSy..."
                    className="input font-mono text-xs pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-black/50 hover:text-black uppercase tracking-wider px-1 py-0.5"
                  >
                    {showKey ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-black/60">
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--brand)] underline hover:opacity-80"
                >
                  Get a free Gemini API key →
                </a>
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testState === "testing" || !inputVal.trim()}
                  className="rounded border border-black/15 bg-white px-2 py-1 text-[11px] font-medium hover:bg-black/5 disabled:opacity-40"
                >
                  {testState === "testing" ? "Testing..." : "Test Key"}
                </button>
              </div>

              {testState === "valid" && (
                <div className="rounded bg-emerald-50 border border-emerald-200 p-2 text-xs text-emerald-800">
                  ✓ {testMessage}
                </div>
              )}

              {testState === "invalid" && (
                <div className="rounded bg-rose-50 border border-rose-200 p-2 text-xs text-rose-800">
                  ✕ {testMessage}
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-black/10 pt-4">
              {apiKey ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-rose-600 hover:underline"
                >
                  Clear Key (Use Mock)
                </button>
              ) : (
                <span className="text-xs text-black/40">Mock mode is active</span>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded border border-black/15 px-3 py-1.5 text-xs text-black/70 hover:bg-black/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded bg-[var(--brand)] px-4 py-1.5 text-xs font-medium text-white hover:opacity-90"
                >
                  Save Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
