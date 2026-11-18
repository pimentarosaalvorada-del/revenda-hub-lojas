import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { 
  ShoppingBag, Search, Plus, Minus, Trash2, Bike, Store as StoreIcon, 
  MessageCircle, Settings, X, Check, ArrowRight, ShieldCheck, Sparkles 
} from 'lucide-react';

interface StoreData {
  id: string;
  name: string;
  slug: string;
  whatsapp: string;
  primary_color: string;
  accent_color: string;
  delivery_fee: number;
}

interface ProductItem {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  custom_price?: number;
  is_active?: boolean;
}

interface CartItem {
  product: ProductItem;
  quantity: number;
  unitPrice: number;
}

export default function App() {
  const [store, setStore] = useState<StoreData>({
    id: 'loja-modelo',
    name: 'Loja Modelo Hub',
    slug: 'loja-modelo',
    whatsapp: '51981838571',
    primary_color: '#0f172a',
    accent_color: '#10b981',
    delivery_fee: 10.00,
  });

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'todos' | 'disponiveis'>('todos');
  const [showCart, setShowCart] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Pedido
  const [isDelivery, setIsDelivery] = useState(true);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Painel Admin
  const [editPriceList, setEditPriceList] = useState<{ [productId: string]: number }>({});
  const [editActiveList, setEditActiveList] = useState<{ [productId: string]: boolean }>({});
  const [savingAdmin, setSavingAdmin] = useState(false);

  const searchParams = new URLSearchParams(window.location.search);
  const storeSlug = searchParams.get('loja') || 'loja-modelo';

  useEffect(() => {
    loadStoreData();
  }, [storeSlug]);

  const loadStoreData = async () => {
    setLoading(true);
    try {
      const { data: storeData } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', storeSlug)
        .maybeSingle();

      if (storeData) setStore(storeData);

      const { data: baseProducts } = await supabase
        .from('products')
        .select('*')
        .order('name');

      let customMap = new Map();
      if (storeData?.id) {
        const { data: customData } = await supabase
          .from('store_products')
          .select('*')
          .eq('store_id', storeData.id);

        if (customData) {
          customMap = new Map(customData.map(cp => [cp.product_id, cp]));
        }
      }

      const initialPrices: { [key: string]: number } = {};
      const initialActives: { [key: string]: boolean } = {};

      const list: ProductItem[] = (baseProducts || []).map(p => {
        const custom = customMap.get(p.id);
        const finalPrice = custom?.custom_price !== undefined ? Number(custom.custom_price) : Number(p.price);
        const active = custom?.is_active !== undefined ? custom.is_active : true;

        initialPrices[p.id] = finalPrice;
        initialActives[p.id] = active;

        return { ...p, custom_price: finalPrice, is_active: active };
      });

      setProducts(list);
      setEditPriceList(initialPrices);
      setEditActiveList(initialActives);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getPrice = (p: ProductItem) => p.custom_price ?? Number(p.price);

  const addToCart = (product: ProductItem) => {
    if (product.stock_quantity <= 0) return;

    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) {
          alert('Quantidade máxima em estoque atingida!');
          return prev;
        }
        return prev.map(i =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1, unitPrice: getPrice(product) }];
    });
  };

  const updateCartQtd = (productId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(i => {
          if (i.product.id === productId) {
            const next = i.quantity + delta;
            if (next > i.product.stock_quantity) return i;
            return next > 0 ? { ...i, quantity: next } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const itemsTotal = cart.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
  const deliveryTax = isDelivery ? Number(store.delivery_fee || 0) : 0;
  const finalTotal = itemsTotal + deliveryTax;

  const handleSendWhatsApp = () => {
    if (cart.length === 0) return;

    if (isDelivery && (!customerName.trim() || !address.trim())) {
      alert('Por favor, informe seu Nome e Endereço para entrega!');
      return;
    }

    let msg = `🛍️ *NOVO PEDIDO - ${store.name.toUpperCase()}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `*ITENS DO PEDIDO:*\n`;
    cart.forEach(i => {
      msg += `▫️ ${i.quantity}x ${i.product.name}\n   R$ ${i.unitPrice.toFixed(2)} un → *R$ ${(i.unitPrice * i.quantity).toFixed(2)}*\n`;
    });

    msg += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `*Subtotal:* R$ ${itemsTotal.toFixed(2)}\n`;
    if (isDelivery) {
      msg += `*Tele-entrega:* R$ ${deliveryTax.toFixed(2)}\n`;
      msg += `*Forma:* Tele-entrega\n`;
    } else {
      msg += `*Forma:* Retirada no Balcão\n`;
    }
    msg += `*TOTAL A PAGAR:* *R$ ${finalTotal.toFixed(2)}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    msg += `*DADOS DO CLIENTE:*\n`;
    msg += `👤 *Nome:* ${customerName || 'Não informado'}\n`;
    if (phone) msg += `📱 *WhatsApp:* ${phone}\n`;
    if (isDelivery) msg += `📍 *Endereço:* ${address}\n`;
    if (notes) msg += `📝 *Obs:* ${notes}\n`;

    const cleanWhats = store.whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanWhats}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleSaveAdmin = async () => {
    setSavingAdmin(true);
    try {
      for (const p of products) {
        const price = editPriceList[p.id] ?? Number(p.price);
        const active = editActiveList[p.id] ?? true;

        await supabase.from('store_products').upsert({
          store_id: store.id,
          product_id: p.id,
          custom_price: price,
          is_active: active,
        }, { onConflict: 'store_id,product_id' });
      }

      alert('Alterações salvas com sucesso!');
      setShowAdmin(false);
      loadStoreData();
    } catch (e: any) {
      alert('Erro ao salvar: ' + e.message);
    } finally {
      setSavingAdmin(false);
    }
  };

  const activeProducts = products.filter(p => p.is_active !== false);
  const filtered = activeProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterMode === 'todos' ? true : p.stock_quantity > 0;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased pb-32">
      {/* Topo da Loja */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              style={{ backgroundColor: store.primary_color || '#0f172a' }} 
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-base shadow-sm"
            >
              {store.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-none">
                  {store.name}
                </h1>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600 inline" /> Pedido Seguro via WhatsApp
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdmin(true)}
              className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
              title="Configurar Loja"
            >
              <Settings className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowCart(true)}
              className="relative p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs transition"
            >
              <ShoppingBag className="w-5 h-5" />
              {cart.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow">
                  {cart.reduce((acc, i) => acc + i.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hero / Banner Rápido */}
      <div className="max-w-2xl mx-auto px-4 mt-4">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-5 rounded-3xl shadow-sm relative overflow-hidden">
          <div className="relative z-10 space-y-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-white/10 px-2.5 py-0.5 rounded-full text-slate-200">
              <Sparkles className="w-3 h-3 text-amber-400" /> Catálogo Atualizado
            </span>
            <h2 className="text-lg font-black tracking-tight pt-1">
              Produtos Exclusivos & Pronta Entrega
            </h2>
            <p className="text-xs text-slate-300 font-medium">
              Escolha suas peças e finalize seu pedido diretamente no nosso WhatsApp.
            </p>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10">
            <ShoppingBag className="w-32 h-32" />
          </div>
        </div>
      </div>

      {/* Busca e Filtros Rápidos */}
      <div className="max-w-2xl mx-auto px-4 mt-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="O que você está procurando hoje?"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/90 rounded-2xl text-xs font-medium placeholder-slate-400 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 shadow-xs transition"
          />
        </div>

        <div className="flex gap-2 text-xs font-bold">
          <button
            onClick={() => setFilterMode('todos')}
            className={`px-3.5 py-1.5 rounded-xl border transition ${
              filterMode === 'todos' 
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            Todos ({products.length})
          </button>
          <button
            onClick={() => setFilterMode('disponiveis')}
            className={`px-3.5 py-1.5 rounded-xl border transition ${
              filterMode === 'disponiveis' 
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            Apenas em Estoque
          </button>
        </div>
      </div>

      {/* Catálogo de Produtos */}
      <main className="max-w-2xl mx-auto px-4 mt-5">
        {loading ? (
          <div className="text-center py-16 text-slate-400 text-xs font-semibold animate-pulse">
            Carregando vitrine de produtos...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl p-8 space-y-2">
            <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">Nenhum produto encontrado</p>
            <p className="text-xs text-slate-400">Tente buscar por outro termo ou limpe os filtros.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5">
            {filtered.map(p => {
              const price = getPrice(p);
              const inStock = p.stock_quantity > 0;

              return (
                <div
                  key={p.id}
                  className="bg-white border border-slate-200/80 rounded-2xl p-3.5 flex flex-col justify-between shadow-xs hover:border-slate-400 transition group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          inStock ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {inStock ? 'Pronta Entrega' : 'Esgotado'}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-xs text-slate-900 line-clamp-2 leading-snug group-hover:text-slate-700 transition">
                      {p.name}
                    </h3>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-end justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                        Valor
                      </span>
                      <span className="text-base font-black text-slate-900 tracking-tight">
                        R$ {price.toFixed(2)}
                      </span>
                    </div>

                    <button
                      disabled={!inStock}
                      onClick={() => addToCart(p)}
                      className={`p-2.5 rounded-xl font-bold flex items-center justify-center transition shadow-xs ${
                        inStock
                          ? 'bg-slate-900 hover:bg-slate-800 text-white'
                          : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Botão de Carrinho Flutuante */}
      {cart.length > 0 && !showCart && (
        <div className="fixed bottom-4 left-4 right-4 z-20 max-w-2xl mx-auto animate-in slide-in-from-bottom duration-300">
          <button
            onClick={() => setShowCart(true)}
            className="w-full py-4 px-5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-2xl flex items-center justify-between shadow-2xl transition border border-slate-800"
          >
            <div className="flex items-center gap-2.5 text-xs">
              <span className="bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded-lg text-[11px]">
                {cart.reduce((acc, i) => acc + i.quantity, 0)}
              </span>
              <span>Itens no carrinho</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-black">
              <span>R$ {itemsTotal.toFixed(2)}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Drawer do Carrinho */}
      {showCart && (
        <div className="fixed inset-0 bg-slate-950/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 max-h-[92vh] overflow-y-auto space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-black text-base text-slate-900">Seu Pedido</h2>
                <p className="text-xs text-slate-400 font-medium">Revise seus itens antes de enviar</p>
              </div>
              <button 
                onClick={() => setShowCart(false)} 
                className="p-1 text-slate-400 hover:text-slate-900 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista dos Itens */}
            <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto space-y-2 pr-1">
              {cart.map(item => (
                <div key={item.product.id} className="pt-2 flex items-center justify-between text-xs">
                  <div className="flex-1 pr-2">
                    <p className="font-extrabold text-slate-900 leading-tight">{item.product.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">R$ {item.unitPrice.toFixed(2)} un</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50">
                      <button onClick={() => updateCartQtd(item.product.id, -1)} className="p-1 hover:bg-slate-200">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 font-black text-xs">{item.quantity}</span>
                      <button onClick={() => updateCartQtd(item.product.id, 1)} className="p-1 hover:bg-slate-200">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="font-black min-w-[55px] text-right text-slate-900">
                      R$ {(item.unitPrice * item.quantity).toFixed(2)}
                    </span>
                    <button onClick={() => updateCartQtd(item.product.id, -item.quantity)} className="text-slate-300 hover:text-red-500 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Tipo de Entrega */}
            <div className="border-t border-slate-100 pt-3 space-y-2.5">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                Forma de Recebimento
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsDelivery(false)}
                  className={`py-3 rounded-xl font-extrabold border flex items-center justify-center gap-2 transition ${
                    !isDelivery 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <StoreIcon className="w-4 h-4" />
                  Balcão
                </button>
                <button
                  type="button"
                  onClick={() => setIsDelivery(true)}
                  className={`py-3 rounded-xl font-extrabold border flex items-center justify-center gap-2 transition ${
                    isDelivery 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Bike className="w-4 h-4" />
                  Tele (+R$ {Number(store.delivery_fee).toFixed(2)})
                </button>
              </div>

              {/* Dados do Cliente */}
              <div className="space-y-2 pt-1 text-xs">
                <input
                  type="text"
                  placeholder="Seu Nome completo *"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900 focus:bg-white font-medium"
                />
                <input
                  type="text"
                  placeholder="Seu WhatsApp com DDD (opcional)"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900 focus:bg-white font-medium"
                />

                {isDelivery && (
                  <input
                    type="text"
                    placeholder="Endereço Completo (Rua, número, bairro) *"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900 focus:bg-white font-medium"
                  />
                )}

                <input
                  type="text"
                  placeholder="Alguma observação? (ex: forma de pagamento, troco)"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900 focus:bg-white font-medium"
                />
              </div>
            </div>

            {/* Total e Checkout */}
            <div className="border-t border-slate-100 pt-3 space-y-3">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-500 font-medium">
                  <span>Subtotal itens:</span>
                  <span>R$ {itemsTotal.toFixed(2)}</span>
                </div>
                {isDelivery && (
                  <div className="flex justify-between text-slate-500 font-medium">
                    <span>Tele-entrega:</span>
                    <span>R$ {Number(store.delivery_fee).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-1 border-t border-slate-100">
                  <span>Total Geral:</span>
                  <span className="text-xl font-black">R$ {finalTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleSendWhatsApp}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition text-sm"
              >
                <MessageCircle className="w-5 h-5" />
                Enviar Pedido no WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Admin (Revendedor) */}
      {showAdmin && (
        <div className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-black text-base text-slate-900">Painel do Revendedor</h2>
                <p className="text-xs text-slate-400 font-medium">{store.name}</p>
              </div>
              <button onClick={() => setShowAdmin(false)} className="p-1 hover:bg-slate-100 rounded-full">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-500 font-medium">
                Defina seus preços de venda e selecione quais peças ficam ativas na sua loja:
              </p>

              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
                {products.map(p => (
                  <div key={p.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 flex-1">
                      <input
                        type="checkbox"
                        checked={editActiveList[p.id] ?? true}
                        onChange={e => setEditActiveList(prev => ({ ...prev, [p.id]: e.target.checked }))}
                        className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 cursor-pointer"
                      />
                      <div>
                        <p className="font-extrabold text-slate-900 leading-tight">{p.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          Custo Hub: R$ {Number(p.price).toFixed(2)} | Estoque: {p.stock_quantity}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 font-bold">
                      <span className="text-slate-400">R$</span>
                      <input
                        type="number"
                        step="0.50"
                        min="0"
                        value={editPriceList[p.id] ?? Number(p.price)}
                        onChange={e => setEditPriceList(prev => ({ ...prev, [p.id]: parseFloat(e.target.value) || 0 }))}
                        className="w-20 p-1.5 border border-slate-200 rounded-lg text-right font-black outline-none focus:border-slate-900 bg-slate-50"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <button
                disabled={savingAdmin}
                onClick={handleSaveAdmin}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl flex items-center justify-center gap-2 transition text-xs"
              >
                <Check className="w-4 h-4" />
                {savingAdmin ? 'Salvando...' : 'Salvar Preços da Minha Loja'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
