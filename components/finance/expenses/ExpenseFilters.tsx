// components/finance/ExpenseFilters.tsx
import { useState } from 'react';
import { ExpenseFilters as Filters, ExpenseStatus } from '@/lib/api/types/finance';

interface ExpenseFiltersProps {
  onFilterChange: (filters: Filters) => void;
}

const categories = [
  'All Categories',
  'TRAVEL',
  'MEALS',
  'OFFICE_SUPPLIES',
  'EQUIPMENT',
  'SOFTWARE',
  'OTHER',
];

const statuses: { label: string; value: ExpenseStatus | 'ALL' }[] = [
  { label: 'All Statuses', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Reimbursed', value: 'REIMBURSED' },
];

export default function ExpenseFilters({ onFilterChange }: ExpenseFiltersProps) {
  const [filters, setFilters] = useState<Filters>({});

  const handleChange = (key: keyof Filters, value: string) => {
    const newFilters = {
      ...filters,
      [key]: value === 'ALL' || value === 'All Categories' ? undefined : value,
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search expenses..."
          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          onChange={(e) => handleChange('search', e.target.value)}
        />
      </div>

      <select
        className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        onChange={(e) => handleChange('category', e.target.value)}
      >
        {categories.map((cat) => (
          <option key={cat} value={cat}>
            {cat === 'All Categories' ? cat : cat.replace('_', ' ')}
          </option>
        ))}
      </select>

      <select
        className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        onChange={(e) => handleChange('status', e.target.value)}
      >
        {statuses.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}