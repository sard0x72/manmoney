import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { CategoryIcon } from '../ui/CategoryIcon';
import { PageHeader } from '../layout/PageHeader';
import type { Category } from '../../types';

const COLORS = ['#BD5C42','#4E7A52','#B23E2E','#B5852A','#8A5A78','#3F7E7A','#A87E2E','#B05772','#6E7A3F','#5B6675','#C2613F','#4A9490'];
const ICONS = ['tag','briefcase','laptop','store','trending-up','gift','plus-circle','utensils','car','shopping-bag','tv','home','zap','heart','graduation-cap','plane','refresh-cw','shield','minus-circle','wallet'];

function CategoryForm({ cat, type, onSave, onCancel }: { cat?: Category; type?: 'income' | 'expense'; onSave: () => void; onCancel: () => void }) {
  const { showToast } = useAppStore();
  const [name, setName] = useState(cat?.name ?? '');
  const [catType, setCatType] = useState<'income' | 'expense'>(cat?.category_type as any ?? type ?? 'expense');
  const [color, setColor] = useState(cat?.color ?? COLORS[0]);
  const [icon, setIcon] = useState(cat?.icon ?? 'tag');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return showToast('Enter a category name', 'error');
    setSaving(true);
    try {
      if (cat) {
        await api.categories.update({ id: cat.id, name: name.trim(), color, icon });
        showToast('Category updated');
      } else {
        await api.categories.create({ name: name.trim(), category_type: catType, color, icon });
        showToast('Category created');
      }
      onSave();
    } catch (e: any) {
      showToast(e?.toString() ?? 'Error', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {!cat && (
        <div>
          <p className="label mb-2">Type</p>
          <div className="flex gap-1 p-1 bg-[hsl(var(--bg))] rounded-xl">
            {(['expense', 'income'] as const).map(t => (
              <button key={t} onClick={() => setCatType(t)}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${catType === t ? 'bg-[var(--surface)] shadow-card text-[hsl(var(--text))]' : 'text-[hsl(var(--text-muted))]'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <label className="label mb-1.5 block">Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} className="input" placeholder="Category name…" autoFocus />
      </div>
      <div>
        <label className="label mb-2 block">Color</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-[hsl(var(--text))] scale-110' : 'hover:scale-105'}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
      <div>
        <label className="label mb-2 block">Icon</label>
        <div className="flex gap-2 flex-wrap">
          {ICONS.map(i => (
            <button key={i} onClick={() => setIcon(i)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${icon === i ? 'ring-2 text-white' : 'bg-[hsl(var(--bg))] text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--border))]'}`}
              style={icon === i ? { backgroundColor: color } : undefined}>
              <CategoryIcon icon={i} size={14} />
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label mb-2 block">Preview</label>
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}20`, color }}>
            <CategoryIcon icon={icon} size={15} />
          </span>
          <span className="text-sm font-medium text-[hsl(var(--text))]">{name || 'Category Name'}</span>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : cat ? 'Update' : 'Create Category'}
        </button>
      </div>
    </div>
  );
}

function CatCard({ cat, onEdit, onDelete }: { cat: Category; onEdit: () => void; onDelete: () => void }) {
  const [hovered, setHovered] = useState(false);
  const tint = `${cat.color}22`;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--line)',
        background: hovered ? 'var(--surface)' : 'var(--paper)',
        cursor: 'default',
        transition: 'background 120ms',
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: tint, color: cat.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <CategoryIcon icon={cat.icon} size={17} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
          color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {cat.name}
        </div>
        {cat.is_default && (
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 1 }}>Default</div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 2, opacity: hovered ? 1 : 0, transition: 'opacity 120ms', flexShrink: 0 }}>
        <button
          onClick={onEdit}
          style={{ padding: 5, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--ink-faint)', display: 'flex' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--paper-sunk)'; (e.currentTarget as HTMLElement).style.color = 'var(--ink)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--ink-faint)'; }}
        >
          <Pencil size={13} />
        </button>
        {!cat.is_default && (
          <button
            onClick={onDelete}
            style={{ padding: 5, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--ink-faint)', display: 'flex' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--negative-tint)'; (e.currentTarget as HTMLElement).style.color = 'var(--negative)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--ink-faint)'; }}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

export function Categories() {
  const { categories, fetchCategories, showToast } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editCat, setEditCat] = useState<Category | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'expense' | 'income'>('expense');

  useEffect(() => { fetchCategories(); }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.categories.delete(deleteId);
      showToast('Category deleted');
      setDeleteId(null);
      fetchCategories();
    } catch (e: any) {
      showToast(e?.toString() ?? 'Error', 'error');
    }
  };

  const filtered = categories.filter(c => c.category_type === activeType);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        eyebrow="Organize"
        title="Categories"
        actions={
          <button onClick={() => { setEditCat(undefined); setShowForm(true); }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} /> New Category
          </button>
        }
      />

      <div style={{ padding: '0 40px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 4, flexShrink: 0, paddingTop: 12, paddingBottom: 12 }}>
        {(['expense', 'income'] as const).map(t => (
          <button key={t} onClick={() => setActiveType(t)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all"
            style={activeType === t
              ? { background: 'var(--clay)', color: 'var(--text-on-accent)' }
              : { color: 'var(--text-secondary)' }}
            onMouseEnter={e => { if (activeType !== t) (e.currentTarget as HTMLElement).style.background = 'var(--paper-sunk)'; }}
            onMouseLeave={e => { if (activeType !== t) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
            {t} Categories
            <span className="ml-1.5 text-xs opacity-70">({categories.filter(c => c.category_type === t).length})</span>
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 40px 56px' }}>
        {filtered.length === 0 ? (
          <EmptyState icon={<Tag size={22} />} title="No categories" description="Create custom categories to organize your transactions." action={<button onClick={() => setShowForm(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={14} /> New Category</button>} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
            {filtered.map(c => (
              <CatCard
                key={c.id}
                cat={c}
                onEdit={() => { setEditCat(c); setShowForm(true); }}
                onDelete={() => setDeleteId(c.id)}
              />
            ))}
          </div>
        )}
      </div>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditCat(undefined); }} title={editCat ? 'Edit Category' : 'New Category'} size="sm">
        <CategoryForm
          cat={editCat}
          type={activeType}
          onSave={() => { setShowForm(false); setEditCat(undefined); fetchCategories(); }}
          onCancel={() => { setShowForm(false); setEditCat(undefined); }}
        />
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Category" size="sm"
        footer={<><button onClick={() => setDeleteId(null)} className="btn-secondary">Cancel</button><button onClick={handleDelete} className="btn-danger">Delete</button></>}
      >
        <p className="text-sm text-[hsl(var(--text-muted))]">Delete this category? You cannot delete categories that have transactions.</p>
      </Modal>
    </div>
  );
}
