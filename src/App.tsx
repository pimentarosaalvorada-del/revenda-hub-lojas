import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  ShoppingBag, Search, Plus, Minus, Trash2, X, Send, 
  MapPin, Store as StoreIcon, ShieldCheck, Settings, CheckCircle2, ArrowRight
} from 'lucide-react';

// ==========================================
// CONFIGURAÇÃO SUPABASE
// ==========================================
const SUPABASE_URL = 'https://mgpabziigapxzzqcuvkz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_uQBgN5VRJhO2L26HukcF2w_sccksQ0B';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// TIPAGEM
// ==========================================
interface Store {
  id: string;
  slug: string;
  name: string;
  whatsapp: string;
  primary_color: string | null;
  accent_color: string | null;
  delivery_fee: number;
  is_active: boolean;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  barcode: string;
}

interface StoreProductItem {
  store_product_id: string;
  product_id: string;
  name: string;
  custom_price: number;
  stock_quantity: number;
  barcode: string;
  is_active: boolean;
}

interface CartItem extends StoreProductItem {
  quantity: number;
}

export default function App() {
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<StoreProductItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  
  // Carrinho & Checkout
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('PIX');

  // Painel de Gestão Rápida do Revendedor
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // 1. Identifica loja pelo slug da URL (?loja=slug ou pathname)
  useEffect(() => {
    loadStoreAndCatalog();
  }, []);

  async function loadStoreAndCatalog() {
    try {
      setLoading(true);
      const urlParams = new URLSearchParams(window.location.search);
      const slugParam = urlParams.get('loja') || window.location.pathname.replace('/', '') || 'loja-modelo';

      // Busca dados da Loja
      const { data: storeData } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', slugParam)
        .eq('is_active', true)
        .single();

      if (!storeData) {
        // Fallback para primeira loja ativa caso não localize pelo slug
        const { data: fallbackStore } = await supabase
          .from('stores')
          .select('*')
          .eq('is_active', true)
          .limit(1)
          .single();
        setStore(fallbackStore);
        if (fallbackStore) await fetchProducts(fallbackStore.id);
      } else {
        setStore(storeData);
        await fetchProducts(storeData.id);
      }
    } catch (err) {
      console.error('Erro ao inicializar:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchProducts(storeId: string) {
    // Busca catálogo central e relação com loja
    const [productsRes, storeProdRes] = await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('store_products').select('*').eq('store_id', storeId)
    ]);

    const centralProducts: Product[] = productsRes.data || [];
    const storeProductsMap = new Map((storeProdRes.data || []).map((sp: any) => [sp.product_id, sp]));

    setAllProducts(centralProducts);

    // Constrói catálogo da vitrine
    const catalog: StoreProductItem[] = centralProducts
      .filter((p) => {
        const sp = storeProductsMap.get(p.id);
        return sp ? sp.is_active : false;
      })
      .map((p) => {
        const sp = storeProductsMap.get(p.id);
        return {
          store_product_id: sp?.id,
          product_id: p.id,
          name: p.name,
          custom_price: Number(sp?.custom_price ?? p.price),
          stock_quantity: p.stock_quantity,
          barcode: p.barcode,
          is_active: sp?.is_active ?? false,
        };
      });

    setProducts(catalog);
  }

  // Ações do Carrinho
  const addToCart = (product: StoreProductItem) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.product_id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) return prev;
        return prev.map((item) =>
          item.product_id === product.product_id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product_id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 && newQty <= item.stock_quantity ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  };

  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + item.custom_price * item.quantity, 0), [cart]);
  const deliveryCost = deliveryType === 'delivery' ? Number(store?.delivery_fee || 0) : 0;
  const total = subtotal + deliveryCost;
  const cartTotalItems = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);

  // Envio do Pedido via WhatsApp
  const handleCheckoutWhatsApp = () => {
    if (!customerName.trim()) {
      alert('Por favor, informe seu nome para o pedido.');
      return;
    }
    if (deliveryType === 'delivery' && !customerAddress.trim()) {
      alert('Por favor, informe o endereço completo para entrega.');
      return;
    }

    const itemsSummary = cart
      .map((item) => `▪ ${item.quantity}x ${item.name} - R$ ${(item.custom_price * item.quantity).toFixed(2)}`)
      .join('\n');

    const message = `*NOVO PEDIDO - ${store?.name}*\n` +
      `-----------------------------------------\n` +
      `👤 *Cliente:* ${customerName}\n` +
      `📦 *Tipo:* ${deliveryType === 'delivery' ? 'Tele-entrega' : 'Retirada no Local'}\n` +
      (deliveryType === 'delivery' ? `📍 *Endereço:* ${customerAddress}\n` : '') +
      `💳 *Pagamento:* ${paymentMethod}\n\n` +
      `*Itens do Pedido:*\n${itemsSummary}\n\n` +
      `-----------------------------------------\n` +
      `Subtotal: R$ ${subtotal.toFixed(2)}\n` +
      (deliveryType === 'delivery' ? `Taxa de Entrega: R$ ${deliveryCost.toFixed(2)}\n` : '') +
      `*TOTAL: R$ ${total.toFixed(2)}*\n` +
      `-----------------------------------------\n` +
      `_Aguardando confirmação do pedido!_`;

    const cleanNumber = (store?.whatsapp || '').replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/55${cleanNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Gestão de produtos do revendedor
  async function toggleStoreProduct(product: Product, currentSp?: any, newPrice?: number) {
    if (!store) return;
    setUpdatingId(product.id);
    try {
      if (currentSp) {
        await supabase
          .from('store_products')
          .update({
            is_active: !currentSp.is_active,
            ...(newPrice !== undefined ? { custom_price: newPrice } : {})
          })
          .eq('id', currentSp.id);
      } else {
        await supabase.from('store_products').insert({
          store_id: store.id,
          product_id: product.id,
          custom_price: product.price,
          is_active: true
        });
      }
      await fetchProducts(store.id);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const primaryColor = store?.primary_color || '#0f172a';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-900 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-24">
      {/* HEADER FIXO MINIMALISTA */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 transition-all">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
              <StoreIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-semibold tracking-tight text-slate-900 leading-tight">{store?.name || 'Revenda Hub'}</h1>
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Catálogo Online
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPanelOpen(true)}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
              title="Área do Revendedor"
            >
              <Settings className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white font-medium text-sm transition shadow-sm hover:opacity-95"
              style={{ backgroundColor: primaryColor }}
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Carrinho</span>
              {cartTotalItems > 0 && (
                <span className="bg-white text-slate-950 px-2 py-0.5 rounded-full text-xs font-bold">
                  {cartTotalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* HERO & BUSCA */}
      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="max-w-xl space-y-2 relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5" /> Produtos Originais Pronta Entrega
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Faça seu pedido direto pelo WhatsApp
            </h2>
            <p className="text-sm text-slate-500">
              Escolha os produtos desejados, selecione retirada ou tele-entrega e finalize em segundos.
            </p>
          </div>

          {/* Input de Busca */}
          <div className="mt-6 relative max-w-lg">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition"
            />
          </div>
        </div>

        {/* GRID DE PRODUTOS */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Produtos Disponíveis</h3>
            <span className="text-xs text-slate-400">{filteredProducts.length} itens</span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
              <p className="text-sm text-slate-400">Nenhum produto encontrado na vitrine no momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {filteredProducts.map((product) => {
                const inCart = cart.find((i) => i.product_id === product.product_id);
                return (
                  <div
                    key={product.product_id}
                    className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition group"
                  >
                    <div>
                      {/* Placeholder de Foto Moderno */}
                      <div className="w-full aspect-square rounded-xl sm:rounded-2xl bg-gradient-to-tr from-slate-100 to-slate-50 flex items-center justify-center relative overflow-hidden mb-3">
                        <span className="text-2xl font-bold text-slate-300 select-none">
                          {product.name.substring(0, 2).toUpperCase()}
                        </span>
                        <div className="absolute top-2 left-2">
                          <span className="text-[10px] font-semibold bg-white/90 backdrop-blur-sm text-slate-700 px-2 py-0.5 rounded-full shadow-2xs">
                            Estoque: {product.stock_quantity}
                          </span>
                        </div>
                      </div>

                      <h4 className="font-medium text-slate-800 text-xs sm:text-sm line-clamp-2 leading-snug">
                        {product.name}
                      </h4>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-50 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Preço</span>
                        <span className="text-sm sm:text-base font-bold text-slate-900">
                          R$ {product.custom_price.toFixed(2)}
                        </span>
                      </div>

                      <button
                        onClick={() => addToCart(product)}
                        disabled={product.stock_quantity <= 0}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${
                          product.stock_quantity <= 0
                            ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                            : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-95'
                        }`}
                        title="Adicionar ao carrinho"
                      >
                        {inCart ? (
                          <span className="text-xs font-bold">{inCart.quantity}</span>
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* DRAWER / BOTTOM SHEET DO CARRINHO */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs" onClick={() => setIsCartOpen(false)} />
          
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
            {/* Cabeçalho do Carrinho */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-slate-700" />
                <h3 className="font-semibold text-slate-900">Seu Carrinho</h3>
                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full font-medium text-slate-600">
                  {cartTotalItems}
                </span>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Itens do Carrinho */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-2">
                  <ShoppingBag className="w-12 h-12 text-slate-200" />
                  <p className="text-sm text-slate-500 font-medium">Carrinho vazio</p>
                  <p className="text-xs text-slate-400">Adicione itens da vitrine para prosseguir.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product_id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex-1 pr-3">
                      <p className="text-xs sm:text-sm font-medium text-slate-800 line-clamp-1">{item.name}</p>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">R$ {item.custom_price.toFixed(2)}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-white rounded-xl border border-slate-200 p-0.5">
                        <button
                          onClick={() => updateQuantity(item.product_id, -1)}
                          className="p-1 text-slate-500 hover:text-slate-800"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center text-xs font-semibold text-slate-800">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product_id, 1)}
                          className="p-1 text-slate-500 hover:text-slate-800"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.product_id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Checkout & WhatsApp */}
            {cart.length > 0 && (
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-4">
                {/* Tipo de Entrega */}
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
                  <button
                    onClick={() => setDeliveryType('delivery')}
                    className={`py-2 rounded-xl text-xs font-medium transition ${
                      deliveryType === 'delivery' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500'
                    }`}
                  >
                    Tele-entrega (+R$ {Number(store?.delivery_fee || 0).toFixed(2)})
                  </button>
                  <button
                    onClick={() => setDeliveryType('pickup')}
                    className={`py-2 rounded-xl text-xs font-medium transition ${
                      deliveryType === 'pickup' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500'
                    }`}
                  >
                    Retirada (Grátis)
                  </button>
                </div>

                {/* Dados do Cliente */}
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Seu Nome completo"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />

                  {deliveryType === 'delivery' && (
                    <input
                      type="text"
                      placeholder="Endereço de entrega (Rua, Nº, Bairro)"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  )}

                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  >
                    <option value="PIX">Pagamento via PIX</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Dinheiro">Dinheiro</option>
                  </select>
                </div>

                {/* Resumo */}
                <div className="pt-2 border-t border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span>R$ {subtotal.toFixed(2)}</span>
                  </div>
                  {deliveryType === 'delivery' && (
                    <div className="flex justify-between text-slate-500">
                      <span>Entrega</span>
                      <span>R$ {deliveryCost.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-slate-900 pt-1">
                    <span>Total</span>
                    <span>R$ {total.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckoutWhatsApp}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-98 transition"
                >
                  <Send className="w-4 h-4" />
                  Enviar Pedido no WhatsApp
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PAINEL SIMPLIFICADO DO REVENDEDOR */}
      {isPanelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs" onClick={() => setIsPanelOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 z-10 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-semibold text-slate-900">Gestão de Vitrine da Loja</h3>
                <p className="text-xs text-slate-400">Ative produtos e ajuste seus preços de revenda.</p>
              </div>
              <button onClick={() => setIsPanelOpen(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-2">
              {allProducts.map((prod) => {
                const storeProd = products.find((p) => p.product_id === prod.id);
                const isActive = !!storeProd?.is_active;

                return (
                  <div key={prod.id} className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-slate-800">{prod.name}</p>
                      <p className="text-xs text-slate-400">Custo base: R$ {Number(prod.price).toFixed(2)} | Estoque: {prod.stock_quantity}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleStoreProduct(prod, storeProd)}
                        disabled={updatingId === prod.id}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                      >
                        {isActive ? 'Ativo na Loja' : 'Oculto'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
