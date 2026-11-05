export function PageHeader({ title, description, actions, badge }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-[24px] leading-9 font-bold tracking-tight text-ink sm:text-[28px] sm:leading-10">
            {title}
          </h1>
          {badge}
        </div>
        {description && <p className="mt-1 text-[14px] leading-6 text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
