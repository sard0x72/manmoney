import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';

/** Fields that rarely matter, folded away so a form shows only the 3–4 that do. */
export function MoreOptions({ defaultOpen = false, children }: { defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: 'var(--ink-muted)',
        }}>
        <ChevronRight size={14} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform var(--dur-fast)' }} />
        More options
      </button>
      {open && <div className="space-y-4" style={{ marginTop: 14 }}>{children}</div>}
    </div>
  );
}
