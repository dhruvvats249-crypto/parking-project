import React, { useEffect, useRef, useState } from "react";
import { searchAddress } from "../api/geocode";

// A text input that looks up addresses as you type (debounced) and shows a
// dropdown of matches. Picking one calls onSelect({ label, lat, lng }).
export default function AddressSearch({ value, onChange, onSelect, placeholder }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const boxRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleChange(e) {
    const val = e.target.value;
    onChange(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchAddress(val);
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 500);
  }

  function handlePick(result) {
    onChange(result.label);
    onSelect(result);
    setOpen(false);
  }

  return (
    <div className="address-search" ref={boxRef}>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder || "Start typing an address..."}
        autoComplete="off"
      />
      {loading && <span className="address-search-loading">Searching...</span>}
      {open && suggestions.length > 0 && (
        <ul className="address-suggestions">
          {suggestions.map((s, i) => (
            <li key={i} onClick={() => handlePick(s)}>
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
