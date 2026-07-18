'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Search, Plus } from 'lucide-react';

interface WessNameSelectorProps {
  /** All available employee names fetched from the transactions table. */
  transactionNames: string[];
  /** Currently selected WessConnect name aliases. */
  selectedNames: string[];
  /** Callback fired when the selection changes. */
  onSelectionChange: (names: string[]) => void;
  /** Current search/filter value inside the name list. */
  searchValue: string;
  /** Callback fired when the search value changes. */
  onSearchChange: (value: string) => void;
  /** Disables all interactive elements (e.g. while a mutation is pending). */
  disabled?: boolean;
}

/**
 * A searchable multi-select picker for mapping WessConnect CSV employee names
 * to a stylist profile. Used in both the Add and Edit stylist dialogs.
 *
 * Features:
 *  - Filterable list of employee names from the transactions table
 *  - Badge display of selected names with individual remove buttons
 *  - Option to add a custom name if it doesn't appear in the list
 *  - Hidden input to submit the selected names as a comma-separated string
 */
export default function WessNameSelector({
  transactionNames,
  selectedNames,
  onSelectionChange,
  searchValue,
  onSearchChange,
  disabled = false,
}: WessNameSelectorProps) {
  const toggleName = (name: string) => {
    const lower = name.toLowerCase();
    if (selectedNames.includes(lower)) {
      onSelectionChange(selectedNames.filter((n) => n !== lower));
    } else {
      onSelectionChange([...selectedNames, lower]);
    }
  };

  const addCustomName = () => {
    const newName = searchValue.trim().toLowerCase();
    if (newName && !selectedNames.includes(newName)) {
      onSelectionChange([...selectedNames, newName]);
    }
    onSearchChange('');
  };

  const filteredNames = transactionNames.filter((name) =>
    name.toLowerCase().includes(searchValue.toLowerCase()),
  );

  const showAddCustom =
    searchValue.trim() &&
    !transactionNames.some(
      (name) => name.toLowerCase() === searchValue.trim().toLowerCase(),
    );

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
        WessConnect CSV Name Matches
      </label>

      {/* Selected Matches as Badges */}
      <div className="flex flex-wrap gap-1.5 mb-2 max-h-24 overflow-y-auto p-1.5 border border-dashed border-gray-200 rounded-lg bg-gray-50/30">
        {selectedNames.length > 0 ? (
          selectedNames.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-800 border border-gray-250 select-none"
            >
              {name}
              <button
                type="button"
                onClick={() =>
                  onSelectionChange(selectedNames.filter((n) => n !== name))
                }
                className="text-gray-400 hover:text-gray-650 focus:outline-none font-bold text-xs"
                disabled={disabled}
                aria-label={`Remove ${name}`}
              >
                &times;
              </button>
            </span>
          ))
        ) : (
          <span className="text-gray-400 text-[10px] italic select-none p-1">
            No names selected. Choose from the list below.
          </span>
        )}
      </div>

      {/* Search and List */}
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        <div className="relative border-b border-gray-150">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search transaction names..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 border-0 bg-transparent h-8.5 text-xs focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-0 rounded-none w-full"
            disabled={disabled}
            aria-label="Search WessConnect employee names"
          />
        </div>

        <div className="max-h-36 overflow-y-auto divide-y divide-gray-100 text-xs">
          {/* Filtered names */}
          {filteredNames.map((name) => {
            const isSelected = selectedNames.includes(name.toLowerCase());
            return (
              <button
                key={name}
                type="button"
                disabled={disabled}
                onClick={() => toggleName(name)}
                className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-gray-50 font-semibold text-black'
                    : 'hover:bg-gray-50 text-gray-600'
                }`}
              >
                <span>{name}</span>
                {isSelected && (
                  <span className="text-[10px] text-emerald-600 font-bold select-none">
                    ✓ Selected
                  </span>
                )}
              </button>
            );
          })}

          {/* Option to add custom name */}
          {showAddCustom && (
            <button
              type="button"
              disabled={disabled}
              onClick={addCustomName}
              className="w-full text-left px-3 py-2 text-emerald-600 hover:text-emerald-700 hover:bg-gray-50 font-medium flex items-center gap-1.5 transition-colors border-t border-dashed border-gray-150 cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              <span>Add &quot;{searchValue.trim()}&quot; as custom match</span>
            </button>
          )}

          {filteredNames.length === 0 && !searchValue.trim() && (
            <div className="px-3 py-4 text-center text-gray-400 italic">
              No transaction names available.
            </div>
          )}
        </div>
      </div>

      {/* Hidden input to submit to backend */}
      <input type="hidden" name="wess_names" value={selectedNames.join(', ')} />
    </div>
  );
}
