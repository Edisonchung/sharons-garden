// components/SearchSuggestions.js - Search suggestions component
import React from 'react';

export function SearchSuggestions({ 
  query, 
  suggestions = [], 
  onSelectSuggestion, 
  loading = false 
}) {
  if (!query && suggestions.length === 0) return null;

  return (
    <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-b-lg shadow-lg z-50 max-h-64 overflow-y-auto">
      {loading && (
        <div className="p-3 text-center text-gray-500">
          <div className="animate-spin inline-block">⟳</div>
          <span className="ml-2">Searching...</span>
        </div>
      )}
      
      {!loading && suggestions.length === 0 && query && (
        <div className="p-3 text-center text-gray-500">
          No suggestions found
        </div>
      )}
      
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSelectSuggestion(suggestion)}
          className="w-full text-left px-4 py-2 hover:bg-purple-50 border-b border-gray-100 last:border-b-0 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-purple-400">🔍</span>
            <span className="text-sm">{suggestion}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
