import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { CategoryIcon } from '../ui/CategoryIcon';
import type { Category } from '../../types';

const COLORS = ['#6174f5','#22c55e','#ef4444','#f97316','#a855f7','#06b6d4','#eab308','#ec4899','#14b8a6','#64748b','#8b5cf6','#3b82f6'];
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
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${catType === t ? 'bg-[hsl(var(--surface))] shadow-card text-[hsl(var(--text))]' : 'text-[hsl(var(--text-muted))]'}`}>
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
    <div className="page-container">
      <div className="page-header">
        <h1 className="text-xl font-bold text-[hsl(var(--text))]">Categories</h1>
        <button onClick={() => { setEditCat(undefined); setShowForm(true); }} className="btn-primary">
          <Plus size={15} /> New Category
        </button>
      </div>

      <div className="px-6 py-3 border-b border-[hsl(var(--border))] flex gap-1 shrink-0">
        {(['expense', 'income'] as const).map(t => (
          <button key={t} onClick={() => setActiveType(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${activeType === t ? 'bg-brand-600 text-white' : 'text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--border))]'}`}>
            {t} Categories
            <span className="ml-1.5 text-xs opacity-70">({categories.filter(c => c.category_type === t).length})</span>
          </button>
        ))}
      </div>

      <div className="page-content">
        {filtered.length === 0 ? (
          <EmptyState icon={<Tag size={22} />} title="No categories" description="Create custom categories to organize your transactions." action={<button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={14} /> New Category</button>} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map(c => (
              <div key={c.id} className="card p-4 group hover:shadow-card-hover transition-shadow flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${c.color}20`, color: c.color }}>
                  <CategoryIcon icon={c.icon} size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[hsl(var(--text))] truncate">{c.name}</p>
                  {c.is_default && <span className="text-xs text-[hsl(var(--text-muted))]">Default</span>}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => { setEditCat(c); setShowForm(true); }}
                    className="p-1 rounded-lg hover:bg-[hsl(var(--border))] text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))] transition-colors">
                    <Pencil size={12} />
                  </button>
                  {!c.is_default && (
                    <button onClick={() => setDeleteId(c.id)}
                      className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-[hsl(var(--text-muted))] hover:text-red-500 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
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
