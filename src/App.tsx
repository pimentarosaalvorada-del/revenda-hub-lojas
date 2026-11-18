import { useEffect, useMemo, useState } from 'react';
import { Search, Settings, ShieldCheck, ShoppingBag, Store as StoreIcon } from 'lucide-react';
import { useStoreData } from './hooks/useStoreData';
import { ProductCard } from './components/ProductCard';
import { CartDrawer } from './components/CartDrawer';
import { ResellerPanel } from './components/ResellerPanel';
import { formatBRL } from './lib/format';
import type { CartItem, CatalogItem } from './types';

function getSlugFromUrl(): string {
  const fromQuery = new URLSearchParams(window.location.search).get('loja');
  if (fromQuery) return fromQuery;
  return window.location.pathname.split('/').filter(Boolean)[0] ?? 'loja-modelo';
}

export default function App() {
  const slug = useMemo(getSlugFromUrl, []);
  const { store, products, storeProducts, status, saveStoreProduct } = useStoreData(slug);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Vitrine = produtos centrais ativos na loja, com preço do revendedor
  const catalog = useMemo<CatalogItem[]>(() => {
    const spByProduct = new Map(storeProducts.map((sp) => [sp.product_id, sp]));
    return products.flatMap((p) => {
      const sp = spByProduct.get(p.id);
      if (!sp?.is_active) return [];
      return [
        {
          storeProductId: sp.id,
          productId: p.id,
          name: p.name,
          price: Number(sp.custom_price),
          stock: Number(p.stock_quantity),
          barcode: p.barcode,
        },
      ];
    });
  }, [products, storeProducts]);

  // Mantém o carrinho coerente quando preço, estoque ou status mudam
  useEffect(() => {
    setCart((prev) =>
      prev.flatMap((item) => {
        const fresh = catalog.find((c) => c.productId === item.productId);
        if (!fresh) return [];
        const quantity = Math.min(item.quantity, fresh.stock);
        return quantity > 0 ? [{ ...item, price: fresh.price, stock: fresh.stock, quantity }] : [];
      })
    );
  }, [catalog]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? catalog.filter((i) => i.name.toLowerCase().includes(q)) : catalog;
  }, [catalog, search]);

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const cartSubtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const qtyInCart = (productId: string) => cart.find((i) => i.productId === productId)?.quantity ?? 0;

  function addToCart(item: CatalogItem) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      if (existing) {
        if (existing.quantity >= item.stock) return prev;
        return prev.map((i) =>
          i.productId === item.productId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }

  function changeQty(productId: string, delta: number) {
    setCart((prev) =>
      prev.flatMap((i) => {
        if (i.productId !== productId) return [i];
        const next = i.quantity + delta;
        if (next <= 0) return [];
        if (next > i.stock) return [i];
        return [{ ...i, quantity: next }];
      })
    );
  }

  function removeItem(productId: string) {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
      </div>
    );
  }

  if (status === 'not-found') {
    return (
      <CenteredMessage
        title="Loja não encontrada"
        text="Verifique o endereço ou fale com o revendedor."
      />
    );
  }

  if (status === 'error' || !store) {
    return (
      <CenteredMessage
        title="Não foi possível carregar a loja"
        text="Tente novamente em instantes."
      />
    );
  }

  const primary = store.primary_color || '#0f172a';
  const accent = store.accent_color || '#10b981';

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28 font-sans text-slate-900 antialiased">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-sm"
              style={{ backgroundColor: primary }}
            >
              <StoreIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-semibold leading-tight tracking-tight">{store.name}</h1>
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                Catálogo online
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPanelOpen(true)}
              className="rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-100"
              aria-label="Área do revendedor"
              title="Área do revendedor"
            >
              <Settings className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-95 active:scale-[0.98]"
              style={{ backgroundColor: primary }}
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Carrinho</span>
              {cartCount > 0 && (
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-900">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 pt-6">
        <section className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="max-w-xl space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Produtos originais · pronta entrega
            </span>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Faça seu pedido direto pelo WhatsApp
            </h2>
            <p className="text-sm text-slate-500">
              Escolha os produtos, selecione retirada ou tele-entrega e finalize em segundos.
            </p>
          </div>

          <div className="relative mt-6 max-w-lg">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Buscar produtos…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
            />
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Produtos disponíveis</h3>
            <span className="text-xs text-slate-400">{filtered.length} itens</span>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center">
              <p className="text-sm text-slate-400">
                {catalog.length === 0
                  ? 'Nenhum produto ativo na vitrine no momento.'
                  : 'Nenhum produto encontrado para essa busca.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {filtered.map((item) => (
                <ProductCard
                  key={item.productId}
                  item={item}
                  accent={primary}
                  quantityInCart={qtyInCart(item.productId)}
                  onAdd={() => addToCart(item)}
                  onRemove={() => changeQty(item.productId, -1)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Barra inferior no mobile quando há itens e o carrinho está fechado */}
      {cartCount > 0 && !cartOpen && (
        <div className="fixed inset-x-0 bottom-4 z-30 px-4 sm:hidden">
          <button
            onClick={() => setCartOpen(true)}
            className="flex w-full items-center justify-between rounded-2xl px-5 py-3.5 text-sm font-semibold text-white shadow-xl transition active:scale-[0.98]"
            style={{ backgroundColor: primary }}
          >
            <span>
              Ver carrinho · {cartCount} {cartCount === 1 ? 'item' : 'itens'}
            </span>
            <span>{formatBRL(cartSubtotal)}</span>
          </button>
        </div>
      )}

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        store={store}
        items={cart}
        accent={accent}
        onChangeQty={changeQty}
        onRemove={removeItem}
      />

      <ResellerPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        products={products}
        storeProducts={storeProducts}
        onSave={saveStoreProduct}
      />
    </div>
  );
}

function CenteredMessage({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      <p className="mt-1 text-sm text-slate-500">{text}</p>
    </div>
  );
}
