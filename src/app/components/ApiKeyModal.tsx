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
        setTestMessage(data.message || "API key is valid and connected!");
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
        className="flex items-center gap-2 rounded-full border border-[#1B475D]/20 bg-white/70 px-3 py-1.5 text-xs font-medium text-[#1B475D] shadow-sm backdrop-blur-sm transition hover:bg-white/95"
        title={apiKey ? "BYOK Active: Custom Gemini API key set" : "No API key set: Running in Mock Mode"}
      >
        <span
          className={`h-2 w-2 rounded-full ${
            apiKey ? "bg-[#8EBD9D] shadow-[0_0_8px_rgba(142,189,157,0.9)] ring-1 ring-[#1B475D]/20" : "bg-[#1B475D]/30"
          }`}
        />
        <span>
          {apiKey ? `BYOK: ${maskedKey}` : "Set API Key (BYOK)"}
        </span>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1B475D]/40 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-xl border border-[#1B475D]/20 bg-[#FFF5D0] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-[#1B475D]"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#1B475D]">
                  Bring Your Own Key (BYOK)
                </h3>
                <p className="mt-1 text-xs text-[#1B475D]/70">
                  Use your Google AI Studio key (<code className="font-mono">AIzaSy...</code>) or Google Cloud Vertex AI key (<code className="font-mono">AQ....</code>). Stored locally in your browser.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-[#1B475D]/50 hover:text-[#1B475D]"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#1B475D] mb-1">
                  Gemini / Vertex AI Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={inputVal}
                    onChange={(e) => {
                      setInputVal(e.target.value);
                      if (testState !== "idle") setTestState("idle");
                    }}
                    placeholder="AIzaSy... or AQ...."
                    className="input font-mono text-xs pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#1B475D]/60 hover:text-[#1B475D] uppercase tracking-wider px-1 py-0.5"
                  >
                    {showKey ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#1B475D]/70">
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#1B475D] underline hover:text-[#8EBD9D]"
                >
                  Get a free Gemini API key →
                </a>
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testState === "testing" || !inputVal.trim()}
                  className="rounded border border-[#1B475D]/20 bg-white/80 px-2 py-1 text-[11px] font-medium text-[#1B475D] hover:bg-[#FAD564]/30 disabled:opacity-40 transition"
                >
                  {testState === "testing" ? "Testing..." : "Test Key"}
                </button>
              </div>

              {testState === "valid" && (
                <div className="rounded bg-[#8EBD9D]/25 border border-[#8EBD9D] p-2 text-xs text-[#1B475D] font-medium">
                  ✓ {testMessage}
                </div>
              )}

              {testState === "invalid" && (
                <div className="rounded bg-rose-50 border border-rose-300 p-2 text-xs text-rose-800">
                  ✕ {testMessage}
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-[#1B475D]/15 pt-4">
              {apiKey ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-rose-700 hover:underline"
                >
                  Clear Key (Use Mock)
                </button>
              ) : (
                <span className="text-xs text-[#1B475D]/50">Mock mode is active</span>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded border border-[#1B475D]/20 bg-white/50 px-3 py-1.5 text-xs text-[#1B475D] hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded bg-[#1B475D] px-4 py-1.5 text-xs font-semibold text-[#FFF5D0] shadow-sm hover:bg-[#1B475D]/90 transition"
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

