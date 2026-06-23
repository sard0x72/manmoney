interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  lead?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, lead, actions }: PageHeaderProps) {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 24,
      padding: '32px var(--content-h-pad) 24px',
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
        {lead && (
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 16,
            color: 'var(--ink-muted)',
            marginTop: 6,
            maxWidth: 520,
            lineHeight: 1.5,
          }}>
            {lead}
          </p>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </header>
  );
}
