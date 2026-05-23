import { useState, useRef } from "react";
import { useTheme } from "../hooks/useTheme.jsx";
import { getTagColor } from "../lib/utils.js";
import { MAX_TAGS_PER_TASK } from "../lib/constants.js";

export function TagInput({ tags = [], onChange, allTags = [] }) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { isDark } = useTheme();
  const inputRef = useRef(null);

  const suggestions = allTags
    .filter(t => !tags.includes(t) && t.toLowerCase().includes(input.toLowerCase()))
    .slice(0, 5);

  function addTag(tag) {
    const cleaned = tag.trim().replace(/^#/, "").replace(/,/g, "");
    if (!cleaned || tags.includes(cleaned) || tags.length >= MAX_TAGS_PER_TASK) return;
    onChange([...tags, cleaned]);
    setInput("");
    setShowSuggestions(false);
  }

  function removeTag(tag) {
    onChange(tags.filter(t => t !== tag));
  }

  function handleKeyDown(e) {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === "Backspace" && !input && tags.length) {
      removeTag(tags[tags.length - 1]);
    }
  }

  const atLimit = tags.length >= MAX_TAGS_PER_TASK;

  return (
    <div>
      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, paddingBottom: 6 }}>
          {tags.map(tag => {
            const c = getTagColor(tag, isDark);
            return (
              <span key={tag} className="tag-pill" style={{ background: c.bg, color: c.text }}>
                #{tag}
                <button onClick={() => removeTag(tag)} style={{ color: c.text }}>×</button>
              </span>
            );
          })}
        </div>
      )}
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value); setShowSuggestions(true); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={atLimit ? `Maks ${MAX_TAGS_PER_TASK} tags` : "Ketik tag, tekan Enter..."}
          disabled={atLimit}
          style={{
            width: "100%", padding: "9px 11px", fontSize: 13,
            border: "1px solid var(--border-input)",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-input)",
            color: "var(--text-primary)",
            boxSizing: "border-box",
            opacity: atLimit ? 0.5 : 1,
          }}
        />
        {showSuggestions && suggestions.length > 0 && input && (
          <div style={{
            position: "absolute", top: "100%", left: 0, right: 0,
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)", marginTop: 4,
            boxShadow: "var(--shadow-md)", zIndex: 10, overflow: "hidden",
          }}>
            {suggestions.map(s => (
              <button key={s} className="suggestion-item" onMouseDown={() => addTag(s)}>
                #{s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
