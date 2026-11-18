import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Product, StoreProduct } from './types';
import { formatBRL } from './format';
import type { SavePatch } from './useStoreData';

interface Props {
  open: boolean;
  onClose: () => void;
  products: Product[];
  storeProducts: StoreProduct[];
  onSave: (product: Product, existing: StoreProduct | undefined, patch: SavePatch) => Promise<void>;
}

export function ResellerPanel({ open, onClose, products, storeProducts, onSave }: Props) {
  if (!open) return null;

  const byProductId = new Map(storeProducts.map((sp) => [sp.product_id, sp]));
  const activeCount = storeProducts.filter((sp) => sp.is_active).length;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      <section className="fixed inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-3xl bg-slate-50 p-5 shadow-2xl animate-in slide-in-from-bottom duration-300 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85vh] sm:w-full sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
        <header className="flex items-start justify-between pb-4">
          <div>
            <h3 className="font-semibold text-slate-900">Gestão da vitrine</h3>
            <p className="text-xs text-slate-500">
              {activeCount} de {products.length} produtos ativos na sua loja
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-200"
            aria-label="Fechar painel"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-2 overflow-y-auto pb-2">
          {products.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              existing={byProductId.get(product.id)}
              onSave={onSave}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

interface RowProps {
  product: Product;
  existing: StoreProduct | undefined;
  onSave: Props['onSave'];
}

function ProductRow({ product, existing, onSave }: RowProps) {
  const isActive = existing?.is_active ?? false;
  const currentPrice = Number(existing?.custom_price ?? product.price);

  const [draft, setDraft] = useState(currentPrice.toFixed(2));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(currentPrice.toFixed(2));
  }, [currentPrice]);

  const parsed = Number(draft.replace(',', '.'));
  const isValidPrice = Number.isFinite(parsed) && parsed > 0;
  const priceChanged = isValidPrice && Math.abs(parsed - currentPrice) > 0.001;

  async function run(patch: SavePatch) {
    setBusy(true);
    setError(null);
    try {
      await onSave(product, existing, patch);
    } catch (err) {
      console.error(err);
      setError('Não foi possível salvar. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">{product.name}</p>
          <p className="text-xs text-slate-400">
            Custo {formatBRL(Number(product.price))} · Estoque {product.stock_quantity}
          </p>
        </div>

        <button
          role="switch"
          aria-checked={isActive}
          disabled={busy}
          onClick={() => run({ is_active: !isActive })}
          className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${
            isActive ? 'bg-emerald-500' : 'bg-slate-200'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
              isActive ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <label className="text-xs text-slate-500">Seu preço</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            R$
          </span>
          <input
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={busy}
            className="w-28 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm outline-none focus:border-slate-900 focus:bg-white"
          />
        </div>
        {priceChanged && (
          <button
            onClick={() => run({ custom_price: parsed })}
            disabled={busy}
            className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {busy ? 'Salvando…' : 'Salvar'}
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
