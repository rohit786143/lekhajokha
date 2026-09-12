"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2 } from "lucide-react";
import { HsnEntry } from "@/lib/hsn-master";

interface HsnSearchAutocompleteProps {
  value: string;
  onChange: (hsnCode: string, gstRate?: number) => void;
  className?: string;
  placeholder?: string;
}

export function HsnSearchAutocomplete({
  value,
  onChange,
  className = "",
  placeholder = "Search HSN (e.g. Laptop)...",
}: HsnSearchAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<HsnEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync internal query with external value if it changes from outside
  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!query.trim() || query === value) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch(`/api/v1/hsn/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        if (json.success) {
          setSuggestions(json.data);
          setIsOpen(json.data.length > 0);
        }
      } catch (err) {
        console.error("Failed to fetch HSN suggestions", err);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [query, value]);

  const handleSelect = (entry: HsnEntry) => {
    setQuery(entry.hsnCode);
    onChange(entry.hsnCode, entry.gstRate);
    setIsOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val); // update parent with whatever is typed
    if (!val) {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className={`w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none ${className}`}
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-60 overflow-y-auto overflow-hidden">
          <ul className="py-1">
            {suggestions.map((s, idx) => (
              <li
                key={`${s.hsnCode}-${idx}`}
                onClick={() => handleSelect(s)}
                className="px-4 py-2.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition flex flex-col gap-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {s.hsnCode}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300">
                    {s.gstRate}% GST
                  </span>
                </div>
                <span className="text-xs text-slate-600 dark:text-slate-400 truncate">
                  {s.description}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
