import { useState } from 'react';
import { Minus, Plus, Send, ShoppingBag, Trash2, X } from 'lucide-react';
import type { CartItem, CustomerData, DeliveryType, PaymentMethod, Store } from '../types';
import { formatBRL } from '../lib/format';
import { buildWhatsAppOrderUrl, getOrderTotals } from '../lib/whatsapp';

interface Props {
  open: boolean;
  onClose: () => void;
  store: Store;
  items: CartItem[];
  accent: string;
  onChangeQty: (productId: string, delta: number) => void;
  onRemove: (productId: string) => void;
}

const PAYMENTS: PaymentMethod[] = ['PIX', 'Cartão de Crédito', 'Dinheiro'];

const inputBase =
  'w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5';

export function CartDrawer({ open, onClose, store, items, accent, onChangeQty, onRemove }: Props) {
  const [delivery, setDelivery] = useState<DeliveryType>('delivery');
  const [customer, setCustomer] = useState<CustomerData>({ name: '', address: '', payment: 'PIX' });
  const [errors, setErrors] = useState<{ name?: string; address?: string }>({});

  if (!open) return null;

  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const { subtotal, fee, total } = getOrderTotals(items, store, delivery);

  function handleSubmit() {
    const next: { name?: string; address?: string } = {};
    if (!customer.name.trim()) next.name = 'Informe seu nome';
    if (delivery === 'delivery' && !customer.address.trim()) {
      next.address = 'Informe o endereço de entrega';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    window.open(buildWhatsAppOrderUrl({ store, items, delivery, customer }), '_blank', 'noopener');
  }

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      <aside
        className="fixed inset-x-0 bottom-0 flex max-h-[92vh] flex-col rounded-t-3xl bg-white shadow-2xl animate-in slide-in-from-bottom duration-300 sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-full sm:max-w-md sm:rounded-none"
        role="dialog"
        aria-label="Carrinho"
      >
        {/* Handle mobile */}
        <div className="flex justify-center pt-2 sm:hidden">
          <span className="h-1.5 w-10 rounded-full bg-slate-200" />
        </div>

        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-slate-700" />
            <h3 className="font-semibold text-slate-900">Seu carrinho</h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {count}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100"
            aria-label="Fechar carrinho"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Itens */}
        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-12 text-center">
              <ShoppingBag className="mb-3 h-12 w-12 text-slate-200" />
              <p className="text-sm font-medium text-slate-600">Seu carrinho está vazio</p>
              <p className="mt-1 text-xs text-slate-400">Adicione produtos da vitrine para continuar.</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.productId}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{item.name}</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">
                    {formatBRL(item.price)} · subtotal {formatBRL(item.price * item.quantity)}
                  </p>
                </div>

                <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-0.5">
                  <button
                    onClick={() => onChangeQty(item.productId, -1)}
                    className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100"
                    aria-label="Diminuir quantidade"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center text-xs font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => onChangeQty(item.productId, 1)}
                    disabled={item.quantity >= item.stock}
                    className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 disabled:opacity-40"
                    aria-label="Aumentar quantidade"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => onRemove(item.productId)}
                  className="p-1.5 text-slate-400 transition hover:text-rose-500"
                  aria-label="Remover item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Checkout */}
        {items.length > 0 && (
          <footer className="space-y-4 border-t border-slate-100 bg-slate-50/60 px-6 py-5">
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-200/60 p-1">
              {(['delivery', 'pickup'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setDelivery(type)}
                  className={`rounded-xl py-2 text-xs transition ${
                    delivery === type
                      ? 'bg-white font-semibold text-slate-900 shadow-sm'
                      : 'font-medium text-slate-500'
                  }`}
                >
                  {type === 'delivery'
                    ? `Tele-entrega (+${formatBRL(Number(store.delivery_fee ?? 0))})`
                    : 'Retirada (grátis)'}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <div>
                <input
                  type="text"
                  placeholder="Seu nome completo"
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  className={`${inputBase} ${errors.name ? 'border-rose-300' : 'border-slate-200'}`}
                />
                {errors.name && <p className="mt-1 px-1 text-xs text-rose-600">{errors.name}</p>}
              </div>

              {delivery === 'delivery' && (
                <div>
                  <input
                    type="text"
                    placeholder="Endereço (rua, número, bairro)"
                    value={customer.address}
                    onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                    className={`${inputBase} ${errors.address ? 'border-rose-300' : 'border-slate-200'}`}
                  />
                  {errors.address && (
                    <p className="mt-1 px-1 text-xs text-rose-600">{errors.address}</p>
                  )}
                </div>
              )}

              <select
                value={customer.payment}
                onChange={(e) => setCustomer({ ...customer, payment: e.target.value as PaymentMethod })}
                className={`${inputBase} border-slate-200`}
              >
                {PAYMENTS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 text-xs text-slate-500">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatBRL(subtotal)}</span>
              </div>
              {delivery === 'delivery' && (
                <div className="flex justify-between">
                  <span>Entrega</span>
                  <span>{formatBRL(fee)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 text-base font-bold text-slate-900">
                <span>Total</span>
                <span>{formatBRL(total)}</span>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98]"
            >
              <Send className="h-4 w-4" />
              Enviar pedido no WhatsApp
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}
