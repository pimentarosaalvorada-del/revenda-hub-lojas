import type { ReactNode } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { CatalogItem } from './types';
import { formatBRL } from './format';

interface Props {
  item: CatalogItem;
  quantityInCart: number;
  accent: string;
  onAdd: () => void;
  onRemove: () => void;
}

export function ProductCard({ item, quantityInCart, accent, onAdd, onRemove }: Props) {
  const outOfStock = item.stock <= 0;
  const lowStock = !outOfStock && item.stock <= 3;
  const initials = item.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <article className="group flex flex-col rounded-3xl border border-slate-100 bg-white p-3 shadow-sm transition duration-200 hover:shadow-md sm:p-4">
      <div className="relative mb-3 flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 via-white to-slate-50">
        <span className="select-none text-3xl font-semibold tracking-tight text-slate-300">
          {initials}
        </span>

        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {outOfStock ? (
            <Tag className="bg-rose-50 text-rose-700">Esgotado</Tag>
          ) : lowStock ? (
            <Tag className="bg-amber-50 text-amber-700">Últimas unidades</Tag>
          ) : (
            <Tag className="bg-emerald-50 text-emerald-700">Pronta entrega</Tag>
          )}
        </div>
      </div>

      <h4 className="line-clamp-2 min-h-[2.5rem] text-xs font-medium leading-snug text-slate-800 sm:text-sm">
        {item.name}
      </h4>

      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        <div>
          <span className="block text-[10px] uppercase tracking-wider text-slate-400">Preço</span>
          <span className="text-sm font-bold text-slate-900 sm:text-base">
            {formatBRL(item.price)}
          </span>
        </div>

        {quantityInCart > 0 ? (
          <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1">
            <button
              onClick={onRemove}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm transition active:scale-95"
              aria-label="Remover uma unidade"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-5 text-center text-xs font-semibold">{quantityInCart}</span>
            <button
              onClick={onAdd}
              disabled={quantityInCart >= item.stock}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm transition active:scale-95 disabled:opacity-40"
              aria-label="Adicionar uma unidade"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onAdd}
            disabled={outOfStock}
            style={{ backgroundColor: outOfStock ? undefined : accent }}
            className="flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-sm transition active:scale-95 disabled:bg-slate-100 disabled:text-slate-300"
            aria-label={`Adicionar ${item.name} ao carrinho`}
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
    </article>
  );
}

function Tag({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm ${className}`}>
      {children}
    </span>
  );
}
