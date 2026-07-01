import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchFilterBarProps {
  onSearch?: (term: string) => void;
  onFilterChange?: (filters: any) => void;
  placeholder?: string;
  filters?: any[];
}

export default function SearchFilterBar({
  onSearch,
  onFilterChange,
  placeholder = 'Search...',
  filters = [],
}: SearchFilterBarProps) {
  const [searchTerm, setSearchTerm] = React.useState('');

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    onSearch?.(term);
  };

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
        />
        {searchTerm && (
          <button
            onClick={() => handleSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
        )}
      </div>
      {filters.length > 0 && (
        <div className="flex gap-2">
          {filters.map((filter, index) => (
            <button
              key={index}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
