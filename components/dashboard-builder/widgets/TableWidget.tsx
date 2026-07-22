"use client";

interface TableWidgetProps {
  title: string;
  columns: Array<{ key: string; label: string }>;
  data: Array<Record<string, unknown>>;
}

const MOCK_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "company", label: "Company" },
  { key: "status", label: "Status" },
  { key: "date", label: "Date" },
];

const MOCK_DATA = [
  { name: "Alice Johnson", email: "alice@example.com", company: "Acme Corp", status: "New", date: "2026-07-20" },
  { name: "Bob Smith", email: "bob@example.com", company: "Globex Inc", status: "Contacted", date: "2026-07-19" },
  { name: "Carol White", email: "carol@example.com", company: "Initech", status: "Qualified", date: "2026-07-18" },
  { name: "Dave Brown", email: "dave@example.com", company: "Umbrella Co", status: "New", date: "2026-07-17" },
  { name: "Eve Davis", email: "eve@example.com", company: "Stark Ind", status: "Contacted", date: "2026-07-16" },
];

export function TableWidget({ title }: TableWidgetProps) {
  const columns = MOCK_COLUMNS;
  const data = MOCK_DATA;

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      New: "bg-blue-100 text-blue-700",
      Contacted: "bg-amber-100 text-amber-700",
      Qualified: "bg-emerald-100 text-emerald-700",
    };
    return map[status] ?? "bg-gray-100 text-gray-600";
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          {title}
        </h3>
      </div>
      <div className="flex-1 overflow-auto px-4 pb-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left py-2 px-1 font-semibold text-gray-400 uppercase tracking-wider"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="border-b border-gray-50 last:border-0">
                <td className="py-2.5 px-1 font-medium text-gray-800">
                  {row.name as string}
                </td>
                <td className="py-2.5 px-1 text-gray-500">{row.email as string}</td>
                <td className="py-2.5 px-1 text-gray-600">{row.company as string}</td>
                <td className="py-2.5 px-1">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColor(row.status as string)}`}
                  >
                    {row.status as string}
                  </span>
                </td>
                <td className="py-2.5 px-1 text-gray-400">{row.date as string}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
