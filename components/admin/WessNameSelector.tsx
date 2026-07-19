'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Plus, X, ChevronDown } from 'lucide-react';

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
 *  - Filterable list of employee names in an on-demand dropdown popover
 *  - Badge display of selected names with modern Lucide remove buttons
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
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
    <div className="space-y-2 relative" ref={containerRef}>
      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block select-none">
        WessConnect CSV Name Matches
      </label>

      {/* Selected Matches as Badges */}
      <div className="flex flex-wrap gap-1.5 min-h-[38px] max-h-24 overflow-y-auto p-1.5 border border-dashed border-gray-200 rounded-lg bg-gray-50/30">
        {selectedNames.length > 0 ? (
          selectedNames.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-800 border border-gray-250 select-none transition-colors hover:bg-gray-150"
            >
              {name}
              <button
                type="button"
                onClick={() =>
                  onSelectionChange(selectedNames.filter((n) => n !== name))
                }
                className="text-gray-400 hover:text-red-500 focus:outline-none p-0.5 rounded-full hover:bg-gray-200 transition-colors"
                disabled={disabled}
                aria-label={`Remove ${name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        ) : (
          <span className="text-gray-400 text-[10px] italic select-none p-1">
            No names selected. Choose from the list below.
          </span>
        )}
      </div>

      {/* Search Bar Input (Trigger for popover) */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
        <Input
          type="text"
          placeholder="Search transaction names to map..."
          value={searchValue}
          onChange={(e) => {
            onSearchChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-8 bg-gray-50/50 border-gray-200 h-9 text-xs focus-visible:border-black focus-visible:ring-black/5 w-full pr-8 cursor-pointer"
          disabled={disabled}
          aria-label="Search WessConnect employee names"
        />
        <ChevronDown 
          className={`absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 transition-transform duration-200 pointer-events-none ${isOpen ? 'rotate-180' : ''}`} 
        />
      </div>

      {/* Popover Dropdown for Selection */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white shadow-lg text-xs select-none">
          {/* Filtered names */}
          {filteredNames.length > 0 ? (
            filteredNames.map((name) => {
              const isSelected = selectedNames.includes(name.toLowerCase());
              return (
                <button
                  key={name}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleName(name)}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-gray-50 font-semibold text-black hover:bg-gray-100'
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
            })
          ) : (
            !showAddCustom && (
              <div className="px-3 py-3 text-center text-gray-400 italic">
                No matching transaction names.
              </div>
            )
          )}

          {/* Option to add custom name */}
          {showAddCustom && (
            <button
              type="button"
              disabled={disabled}
              onClick={addCustomName}
              className="w-full text-left px-3 py-2 text-emerald-600 hover:text-emerald-700 hover:bg-gray-50 font-semibold flex items-center gap-1.5 transition-colors border-t border-dashed border-gray-150 cursor-pointer"
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
      )}

      {/* Hidden input to submit to backend */}
      <input type="hidden" name="wess_names" value={selectedNames.join(', ')} />
    </div>
  );
}
