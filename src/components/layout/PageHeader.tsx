interface PageHeaderProps {
  /** Only the Dashboard uses this, for today's date. Other pages have no label above the title. */
  eyebrow?: string;
  title: string;
  actions?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, actions }: PageHeaderProps) {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 24,
      padding: 'calc(32px * var(--v-rhythm)) var(--content-h-pad) calc(24px * var(--v-rhythm))',
      borderBottom: '1px solid var(--line)',
      flexShrink: 0,
    }}>
      <div>
        {eyebrow && (
          <div className="mm-eyebrow" style={{ marginBottom: 8 }}>{eyebrow}</div>
        )}
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'var(--type-title)',
          fontWeight: 600,
          color: 'var(--ink-strong)',
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
        }}>
          {title}
        </h1>
      </div>
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </header>
  );
}
