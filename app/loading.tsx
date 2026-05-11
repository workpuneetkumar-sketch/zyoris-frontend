export default function Loading() {
  return (
    <div className="min-h-screen bg-[#f5f7fb] flex">
      {/* Sidebar Skeleton */}
      <aside className="w-[330px] bg-white border-r border-gray-200 flex flex-col justify-between">
        <div>
          {/* Logo */}
          <div className="h-[92px] flex items-center px-8 border-b border-gray-100">
            <div className="w-11 h-11 rounded-xl bg-blue-600 animate-pulse" />
            <div className="ml-4 h-7 w-28 rounded-md bg-gray-200 animate-pulse" />
          </div>

          {/* Nav Items */}
          <div className="px-4 py-6 space-y-4">
            <div className="h-14 rounded-2xl bg-blue-600 animate-pulse" />

            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 rounded-xl bg-gray-100 animate-pulse"
              />
            ))}
          </div>
        </div>

        {/* Profile Footer */}
        <div className="border-t border-gray-100 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 animate-pulse" />
            <div>
              <div className="w-24 h-4 rounded bg-gray-200 animate-pulse mb-2" />
              <div className="w-32 h-3 rounded bg-gray-100 animate-pulse" />
            </div>
          </div>

          <div className="w-5 h-5 rounded bg-gray-200 animate-pulse" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 px-9 py-8 overflow-hidden">
        {/* Topbar */}
        <div className="flex items-start justify-between mb-12">
          <div>
            <div className="w-44 h-10 rounded-lg bg-gray-200 animate-pulse mb-3" />
            <div className="w-72 h-5 rounded bg-gray-100 animate-pulse" />
          </div>

          <div className="flex items-center gap-4">
            <div className="w-[330px] h-14 rounded-2xl bg-white border border-gray-200 animate-pulse" />

            <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 animate-pulse" />

            <div className="w-48 h-14 rounded-2xl bg-blue-600 animate-pulse" />
          </div>
        </div>

        {/* Executive Overview */}
        <div className="mb-8">
          <div className="w-56 h-8 rounded bg-gray-200 animate-pulse mb-3" />
          <div className="w-64 h-5 rounded bg-gray-100 animate-pulse" />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-6 mb-10">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-[28px] border border-gray-100 p-8 h-[265px]"
            >
              <div className="flex items-start justify-between mb-10">
                <div className="w-40 h-5 rounded bg-gray-100 animate-pulse" />
                <div className="w-14 h-14 rounded-2xl bg-gray-100 animate-pulse" />
              </div>

              <div className="w-28 h-14 rounded bg-gray-200 animate-pulse mb-5" />

              <div className="w-48 h-5 rounded bg-gray-100 animate-pulse mb-6" />

              <div className="w-24 h-10 rounded-xl bg-gray-100 animate-pulse" />
            </div>
          ))}
        </div>

        {/* Recommendations */}
        <div className="bg-white border border-dashed border-gray-200 rounded-[28px] h-24 mb-10 animate-pulse" />

        {/* Upload Card */}
        <div className="bg-white rounded-[28px] border border-gray-100 h-[220px] p-8">
          <div className="w-64 h-8 rounded bg-gray-200 animate-pulse mb-4" />
          <div className="w-96 h-5 rounded bg-gray-100 animate-pulse mb-10" />

          <div className="border-2 border-dashed border-gray-200 rounded-2xl h-[90px] animate-pulse" />
        </div>
      </main>
    </div>
  );
}