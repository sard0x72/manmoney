import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { RowMenu } from '../ui/RowMenu';
import { useAddRequest } from '../../lib/useAddRequest';
import { FormSheet, useDirty } from '../ui/FormSheet';
import { Segmented } from '../ui/Segmented';
import { EmptyState } from '../ui/EmptyState';
import { CategoryIcon } from '../ui/CategoryIcon';
import { PageHeader } from '../layout/PageHeader';
import type { Category } from '../../types';

const COLORS = ['#BD5C42','#4E7A52','#B23E2E','#B5852A','#8A5A78','#3F7E7A','#A87E2E','#B05772','#6E7A3F','#5B6675','#C2613F','#4A9490'];
const ICONS = ['tag','briefcase','laptop','store','trending-up','gift','plus-circle','utensils','car','shopping-bag','tv','home','zap','heart','graduation-cap','plane','refresh-cw','shield','minus-circle','wallet'];

function CategoryForm({ cat, type, onSaved, onClose }: { cat?: Category; type?: 'income' | 'expense'; onSaved: () => void; onClose: () => void }) {
  const { showToast } = useAppStore();
  const [name, setName] = useState(cat?.name ?? '');
  const [catType, setCatType] = useState<'income' | 'expense'>(cat?.category_type ?? type ?? 'expense');
  const [color, setColor] = useState(cat?.color ?? COLORS[0]);
  const [icon, setIcon] = useState(cat?.icon ?? 'tag');
  const [saving, setSaving] = useState(false);
  const dirty = useDirty({ name, catType, color, icon });

  const handleSave = async () => {
    if (!name.trim()) return showToast('Enter a name', 'error');
    setSaving(true);
    try {
      if (cat) await api.categories.update({ id: cat.id, name: name.trim(), color, icon });
      else await api.categories.create({ name: name.trim(), category_type: catType, color, icon });
      showToast('Saved');
      onSaved();
      onClose();
    } catch (e: any) {
      showToast(e?.toString() ?? 'Error', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormSheet title={cat ? 'Edit category' : 'Add category'} onClose={onClose} onSubmit={handleSave} dirty={dirty} saving={saving}>
      {cat ? (
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-faint)' }}>
          {cat.category_type === 'income' ? 'Income' : 'Expense'} category
        </p>
      ) : (
        <Segmented value={catType} onChange={setCatType} label="Type" options={[['expense', 'Expense'], ['income', 'Income']]} />
      )}
      <div>
        <label className="label mb-1.5 block">Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} className="input" placeholder="Name" autoFocus />
      </div>
      <div>
        <label className="label mb-2 block">Color</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(c => (
            <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Colour ${c}`} aria-pressed={color === c}
              className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-[hsl(var(--text))] scale-110' : 'hover:scale-105'}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
      <div>
        <label className="label mb-2 block">Icon</label>
        <div className="flex gap-2 flex-wrap">
          {ICONS.map(i => (
            <button key={i} type="button" onClick={() => setIcon(i)} aria-label={`Icon ${i}`} aria-pressed={icon === i}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${icon === i ? 'ring-2 text-white' : 'bg-[hsl(var(--bg))] text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--border))]'}`}
              style={icon === i ? { backgroundColor: color } : undefined}>
              <CategoryIcon icon={i} size={14} />
            </button>
          ))}
        </div>
      </div>
    </FormSheet>
  );
}

function CatCard({ cat, onEdit, onDelete }: { cat: Category; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="group mm-acctrow" role="button" tabIndex={0} onClick={onEdit}
      onKeyDown={e => { if (e.key === 'Enter' && e.target === e.currentTarget) onEdit(); }}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 10px 12px 14px',
        borderRadius: 'var(--radius)', border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer',
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: `${cat.color}22`, color: cat.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <CategoryIcon icon={cat.icon} size={17} />
      </div>
      <div style={{
        flex: 1, minWidth: 0, fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
        color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {cat.name}
      </div>
      <RowMenu items={[
        { label: 'Edit', icon: <Pencil size={13} />, onSelect: onEdit },
        {
          label: 'Delete', icon: <Trash2 size={13} />, onSelect: onDelete, danger: true,
          disabled: cat.is_default, hint: "Built-in categories can't be deleted",
        },
      ]} />
    </div>
  );
}

export function Categories() {
  const { categories: all, fetchCategories, pendingDeletes, deleteWithUndo } = useAppStore();
  const categories = all.filter(c => !pendingDeletes.has(c.id));
  const [showForm, setShowForm] = useState(false);
  const [editCat, setEditCat] = useState<Category | undefined>();
  const [activeType, setActiveType] = useState<'expense' | 'income'>('expense');
  const openForm = (c?: Category) => { setEditCat(c); setShowForm(true); };
  useAddRequest('categories', () => openForm());

  useEffect(() => { fetchCategories(); }, []);

  // If the category turns out to be in use, the real delete fails, the error
  // says why, and the card comes back.
  const handleDelete = (c: Category) => deleteWithUndo({
    id: c.id, label: 'Category',
    commit: async () => { await api.categories.delete(c.id); await fetchCategories(); },
  });

  const filtered = categories.filter(c => c.category_type === activeType);
  const count = (t: 'expense' | 'income') => categories.filter(c => c.category_type === t).length;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        eyebrow="Organize"
        title="Categories"
        actions={
          <button onClick={() => openForm()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} /> Add category
          </button>
        }
      />

      <div style={{ padding: '12px var(--content-h-pad)', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <Segmented size="sm" fill={false} value={activeType} onChange={setActiveType} label="Category type"
          options={[['expense', 'Expense', count('expense')], ['income', 'Income', count('income')]]} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px var(--content-h-pad) 56px' }}>
        {filtered.length === 0 ? (
          <EmptyState icon={<Tag size={22} />} title="No categories" description="Create custom categories to organize your transactions."
            action={<button onClick={() => openForm()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={14} /> Add category</button>} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
            {filtered.map(c => (
              <CatCard key={c.id} cat={c} onEdit={() => openForm(c)} onDelete={() => handleDelete(c)} />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <CategoryForm
          key={editCat?.id ?? 'new'}
          cat={editCat}
          type={activeType}
          onSaved={fetchCategories}
          onClose={() => { setShowForm(false); setEditCat(undefined); }}
        />
      )}
    </div>
  );
}
