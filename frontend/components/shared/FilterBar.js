"use client";

export default function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Tìm kiếm...",
  searchLabel = "Tìm kiếm",
  filters = [],
  actions
}) {
  const hasSearch = typeof onSearchChange === "function";

  return (
    <section className="surface-panel">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="grid flex-1 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_repeat(2,minmax(0,1fr))]">
          {hasSearch ? (
            <label className="block">
              <span className="field-label">{searchLabel}</span>
              <input
                className="field-input"
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={searchPlaceholder}
              />
            </label>
          ) : null}

          {filters.map((filter) => (
            <label key={filter.key} className="block">
              <span className="field-label">{filter.label}</span>
              <select className="field-input" value={filter.value} onChange={(event) => filter.onChange(event.target.value)}>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}
