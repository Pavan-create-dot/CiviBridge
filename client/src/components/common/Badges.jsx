// Shared presentational badges for complaint status, priority, and language.
import React from 'react';

export function StatusBadge({ status }) {
  return <span className={`status-badge status-${status}`}>{status.replace('_', ' ')}</span>;
}

export function PriorityBadge({ priority, suffix = '' }) {
  return (
    <span className={`priority-badge priority-${priority}`}>
      {priority}
      {suffix}
    </span>
  );
}

export function LanguageTag({ language, className = 'lang-pill' }) {
  return <span className={className}>{language.toUpperCase()}</span>;
}

/**
 * Render a <select> populated from a { value, label } option list, prefixed by
 * an "all" option used by the triage filters.
 */
export function FilterSelect({ value, onChange, options, allLabel }) {
  return (
    <select value={value} onChange={onChange}>
      <option value="">{allLabel}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/**
 * Render a <select> populated from a { value, label } option list.
 */
export function OptionSelect({ value, onChange, options }) {
  return (
    <select value={value} onChange={onChange}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
