export default function HrHeader() {
  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex justify-between items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-[30px] font-semibold text-slate-800">HR Portal</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 line-clamp-2">
            Manage your workforce and HR operations in one place.
          </p>
        </div>
      </div>
    </div>
  );
}