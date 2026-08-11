import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  value: string | number;
  onChange: (e: { target: { value: string; name?: string } }) => void;
  name?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  leftIcon?: React.ReactNode;
  isSearchable?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  onChange,
  name,
  placeholder = 'Select option...',
  error,
  disabled = false,
  className = '',
  leftIcon,
  isSearchable = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && isSearchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen, isSearchable]);

  const handleSelect = (optValue: string | number) => {
    onChange({ target: { value: String(optValue), name } });
    setIsOpen(false);
  };

  return (
    <div className={`relative w-full animate-fade-in ${isOpen ? 'z-40' : 'z-10'} ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1 uppercase">
          {label}
        </label>
      )}

      {/* Trigger Button / Input Display */}
      <div
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`relative flex items-center justify-between px-3.5 py-2.5 text-sm rounded-2xl bg-white border ${
          isOpen ? 'border-[#864f19] ring-2 ring-[#864f19]/20' : 'border-slate-200/90'
        } text-slate-900 shadow-xs cursor-pointer transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : 'hover:border-[#864f19]/60'
        }`}
      >
        <div className="flex items-center gap-2 truncate pr-4">
          {leftIcon && <span className="text-slate-400 shrink-0">{leftIcon}</span>}
          <span className={`truncate font-medium text-xs ${!selectedOption ? 'text-slate-400' : 'text-slate-800'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#864f19]' : ''}`} />
      </div>

      {/* Dropdown Menu Popup */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search Box inside Dropdown */}
          {isSearchable && (
            <div className="p-2 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to filter..."
                className="w-full text-xs bg-transparent border-none focus:outline-none text-slate-800 placeholder-slate-400 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 hover:bg-slate-200 rounded-full text-slate-400"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto p-1 scrollbar-thin">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400 font-medium italic">
                No matching options
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#ffdcc2]/60 text-[#864f19]'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#864f19] shrink-0 ml-2" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-500 font-medium pl-1">{error}</p>}
    </div>
  );
};
