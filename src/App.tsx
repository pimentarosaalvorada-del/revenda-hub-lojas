import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { ShoppingBag, Search, Plus, Minus, Trash2, Bike, Store as StoreIcon, MessageCircle, Settings, X, Check } from 'lucide-react';

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
  const [store, setStore] = useState<StoreData | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // Pedido
  const [isDelivery, setIsDelivery] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Painel de Configuração do Revendedor
  const [editPriceList, setEditPriceList] = useState<{ [productId: string]: number }>({});
  const [editActiveList, setEditActiveList] = useState<{ [productId: string]: boolean }>({});
  const [savingAdmin, setSavingAdmin] = useState(false);

  // Lê o slug pela URL (ex: ?loja=pimentarosa ou padrão 'loja-modelo')
  const searchParams = new URLSearchParams(window.location.search);
  const storeSlug = searchParams.get('loja') || 'loja-modelo';

  useEffect(() => {
    loadStore();
  }, [storeSlug]);

  const loadStore = async () => {
    const { data: storeData } = await supabase
      .from('stores')
      .select('*')
      .eq('slug', storeSlug)
      .single();

    if (storeData) {
      setStore(storeData);

      // Puxa os produtos do estoque central
      const { data: baseProducts } = await supabase
        .from('products')
        .select('*')
        .order('name');

      // Puxa as regras desta loja
      const { data: customData } = await supabase
        .from('store_products')
        .select('*')
        .eq('store_id', storeData.id);

      const customMap = new Map((customData || []).map(cp => [cp.product_id, cp]));

      const initialPrices: { [key: string]: number } = {};
      const initialActives: { [key: string]: boolean } = {};

      const finalProducts: ProductItem[] = (baseProducts || []).map(p => {
        const custom = customMap.get(p.id);
        const finalPrice = custom ? Number(custom.custom_price) : Number(p.price);
        const active = custom ? custom.is_active : true;

        initialPrices[p.id] = finalPrice;
        initialActives[p.id] = active;

        return {
          ...p,
          custom_price: finalPrice,
          is_active: active,
        };
      });

      setProducts(finalProducts);
      setEditPriceList(initialPrices);
      setEditActiveList(initialActives);
    }
  };

  const getPrice = (p: ProductItem) => p.custom_price ?? Number(p.price);

  const addToCart = (product: ProductItem) => {
    if (product.stock_quantity <= 0) {
      alert('Produto esgotado no momento!');
      return;
    }

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
  const deliveryTax = isDelivery ? Number(store?.delivery_fee || 0) : 0;
  const finalTotal = itemsTotal + deliveryTax;

  const handleSendWhatsApp = () => {
    if (cart.length === 0 || !store) return;

    if (isDelivery && (!customerName.trim() || !address.trim())) {
      alert('Por favor, informe seu Nome e Endereço para a entrega!');
      return;
    }

    let msg = `🛍️ *NOVO PEDIDO - ${store.name}*\n\n`;
    msg += `*Itens do Pedido:*\n`;
    cart.forEach(i => {
      msg += `▪ ${i.quantity}x ${i.product.name} (R$ ${i.unitPrice.toFixed(2)} un) = R$ ${(i.unitPrice * i.quantity).toFixed(2)}\n`;
    });

    msg += `\n*Subtotal:* R$ ${itemsTotal.toFixed(2)}\n`;
    if (isDelivery) {
      msg += `*Tele-entrega:* R$ ${deliveryTax.toFixed(2)}\n`;
      msg += `*Tipo:* Tele-entrega\n`;
    } else {
      msg += `*Tipo:* Retirada no Balcão\n`;
    }
    msg += `*TOTAL:* R$ ${finalTotal.toFixed(2)}\n\n`;

    msg += `*Dados do Cliente:*\n`;
    msg += `Nome: ${customerName || 'Não informado'}\n`;
    if (phone) msg += `WhatsApp: ${phone}\n`;
    if (isDelivery) msg += `Endereço: ${address}\n`;
    if (notes) msg += `Observações: ${notes}\n`;

    const cleanWhats = store.whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanWhats}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleSaveAdmin = async () => {
    if (!store) return;
    setSavingAdmin(true);

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

    setSavingAdmin(false);
    setShowAdmin(false);
    loadStore();
    alert('Configurações da loja salvas com sucesso!');
  };

  const activeProducts = products.filter(p => p.is_active !== false);
  const filtered = activeProducts.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 font-sans">
        Carregando vitrine...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-28">
      {/* Topo da Loja */}
      <header
        style={{ backgroundColor: store.primary_color || '#000000' }}
        className="text-white px-4 py-4 sticky top-0 z-30 shadow-md"
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black tracking-tight leading-tight">{store.name}</h1>
            <p className="text-[11px] text-white/70">Catálogo Oficial</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdmin(true)}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition text-white"
              title="Gerenciar minha loja"
            >
              <Settings className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowCart(true)}
              className="relative p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition text-white"
            >
              <ShoppingBag className="w-5 h-5" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-emerald-500 text-white font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow">
                  {cart.reduce((acc, i) => acc + i.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Campo de Busca */}
      <div className="max-w-2xl mx-auto px-4 mt-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar produto no catálogo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-black shadow-sm"
          />
        </div>
      </div>

      {/* Grade de Produtos */}
      <main className="max-w-2xl mx-auto px-4 mt-5">
        <div className="grid grid-cols-2 gap-3.5">
          {filtered.map(p => {
            const price = getPrice(p);
            const inStock = p.stock_quantity > 0;

            return (
              <div
                key={p.id}
                className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        inStock ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {inStock ? 'Disponível' : 'Esgotado'}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-gray-900 line-clamp-2 leading-snug">
                    {p.name}
                  </h3>
                </div>

                <div className="mt-4 pt-2 border-t flex items-end justify-between">
                  <div>
                    <span className="text-[10px] text-gray-400 block font-medium">Preço</span>
                    <span className="text-base font-black text-gray-900">
                      R$ {price.toFixed(2)}
                    </span>
                  </div>

                  <button
                    disabled={!inStock}
                    onClick={() => addToCart(p)}
                    style={{
                      backgroundColor: inStock ? store.accent_color || '#059669' : '#e5e7eb',
                    }}
                    className="p-2 text-white rounded-xl shadow-sm hover:opacity-90 disabled:cursor-not-allowed transition"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Botão Flutuante de Carrinho */}
      {cart.length > 0 && !showCart && (
        <div className="fixed bottom-4 left-4 right-4 z-20 max-w-2xl mx-auto">
          <button
            onClick={() => setShowCart(true)}
            style={{ backgroundColor: store.primary_color || '#000000' }}
            className="w-full py-4 px-5 text-white font-extrabold rounded-2xl flex items-center justify-between shadow-2xl"
          >
            <div className="flex items-center gap-2 text-sm">
              <ShoppingBag className="w-5 h-5" />
              <span>{cart.reduce((acc, i) => acc + i.quantity, 0)} itens</span>
            </div>
            <div className="text-base font-black">
              Ver Carrinho: R$ {itemsTotal.toFixed(2)}
            </div>
          </button>
        </div>
      )}

      {/* Modal do Carrinho */}
      {showCart && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-extrabold text-base text-gray-900">Seu Pedido</h2>
              <button onClick={() => setShowCart(false)} className="text-xs font-bold text-gray-400 hover:text-black">
                Fechar
              </button>
            </div>

            <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto space-y-2 pr-1">
              {cart.map(item => (
                <div key={item.product.id} className="pt-2 flex items-center justify-between text-xs">
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{item.product.name}</p>
                    <p className="text-gray-400">R$ {item.unitPrice.toFixed(2)} un</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border rounded-lg bg-gray-50">
                      <button onClick={() => updateCartQtd(item.product.id, -1)} className="p-1 hover:bg-gray-200">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 font-bold">{item.quantity}</span>
                      <button onClick={() => updateCartQtd(item.product.id, 1)} className="p-1 hover:bg-gray-200">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="font-bold min-w-[50px] text-right">
                      R$ {(item.unitPrice * item.quantity).toFixed(2)}
                    </span>
                    <button onClick={() => updateCartQtd(item.product.id, -item.quantity)} className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-3 space-y-2">
              <label className="text-xs font-bold text-gray-600 block">Forma de Retirada/Entrega</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsDelivery(false)}
                  className={`py-2 rounded-xl font-bold border flex items-center justify-center gap-1.5 ${
                    !isDelivery ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-600'
                  }`}
                >
                  <StoreIcon className="w-4 h-4" />
                  Balcão
                </button>
                <button
                  type="button"
                  onClick={() => setIsDelivery(true)}
                  className={`py-2 rounded-xl font-bold border flex items-center justify-center gap-1.5 ${
                    isDelivery ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-600'
                  }`}
                >
                  <Bike className="w-4 h-4" />
                  Tele-entrega (+R$ {Number(store.delivery_fee).toFixed(2)})
                </button>
              </div>

              <div className="space-y-2 pt-2 text-xs">
                <input
                  type="text"
                  placeholder="Seu Nome completo *"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none focus:ring-1 focus:ring-black"
                />
                <input
                  type="text"
                  placeholder="WhatsApp com DDD"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none focus:ring-1 focus:ring-black"
                />

                {isDelivery && (
                  <input
                    type="text"
                    placeholder="Endereço completo (Rua, nº, bairro) *"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none focus:ring-1 focus:ring-black"
                  />
                )}

                <input
                  type="text"
                  placeholder="Observações (forma de pagamento, troco, etc.)"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none focus:ring-1 focus:ring-black"
                />
              </div>
            </div>

            <div className="border-t pt-3 space-y-3">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-gray-500">Total do Pedido:</span>
                <span className="text-xl font-black text-gray-900">R$ {finalTotal.toFixed(2)}</span>
              </div>

              <button
                onClick={handleSendWhatsApp}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-lg transition"
              >
                <MessageCircle className="w-5 h-5" />
                Enviar Pedido no WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Administração do Revendedor (Painel de Preços) */}
      {showAdmin && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="font-extrabold text-base text-gray-900">Painel do Revendedor</h2>
                <p className="text-xs text-gray-500">{store.name}</p>
              </div>
              <button onClick={() => setShowAdmin(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-gray-600">
                Ajuste os preços de venda e marque quais produtos deseja exibir na sua vitrine:
              </p>

              <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto pr-1">
                {products.map(p => (
                  <div key={p.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="checkbox"
                        checked={editActiveList[p.id] ?? true}
                        onChange={e => setEditActiveList(prev => ({ ...prev, [p.id]: e.target.checked }))}
                        className="w-4 h-4 rounded text-black focus:ring-black"
                      />
                      <div>
                        <p className="font-bold text-gray-900 leading-tight">{p.name}</p>
                        <p className="text-[10px] text-gray-400">Custo Base: R$ {Number(p.price).toFixed(2)} | Estoque: {p.stock_quantity}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">R$</span>
                      <input
                        type="number"
                        step="0.50"
                        min="0"
                        value={editPriceList[p.id] ?? Number(p.price)}
                        onChange={e => setEditPriceList(prev => ({ ...prev, [p.id]: parseFloat(e.target.value) || 0 }))}
                        className="w-20 p-1.5 border rounded-lg text-right font-bold outline-none focus:ring-1 focus:ring-black bg-gray-50"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <button
                disabled={savingAdmin}
                onClick={handleSaveAdmin}
                className="w-full py-3 bg-black hover:bg-gray-800 text-white font-extrabold rounded-xl flex items-center justify-center gap-2 transition"
              >
                <Check className="w-4 h-4" />
                {savingAdmin ? 'Salvando...' : 'Salvar Alterações da Loja'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
