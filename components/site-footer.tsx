export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
          Sightline — market analysis portal for crypto and stocks. Trading
          involves risk, and past performance does not guarantee future results.
          This site is for informational purposes only.
        </p>
        <p className="text-xs text-muted-foreground">
          &copy; 2026 Sightline
        </p>
      </div>
    </footer>
  )
}
