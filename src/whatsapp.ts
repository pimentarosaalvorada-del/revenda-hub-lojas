import type { CartItem, CustomerData, DeliveryType, Store } from './types';
import { formatBRL } from './format';

export function getOrderTotals(items: CartItem[], store: Store, delivery: DeliveryType) {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const fee = delivery === 'delivery' ? Number(store.delivery_fee ?? 0) : 0;
  return { subtotal, fee, total: subtotal + fee };
}

interface OrderInput {
  store: Store;
  items: CartItem[];
  delivery: DeliveryType;
  customer: CustomerData;
}

export function buildWhatsAppOrderUrl({ store, items, delivery, customer }: OrderInput) {
  const { subtotal, fee, total } = getOrderTotals(items, store, delivery);
  const isDelivery = delivery === 'delivery';

  const lines = [
    `*NOVO PEDIDO - ${store.name}*`,
    '──────────────────────',
    `Cliente: ${customer.name.trim()}`,
    `Tipo: ${isDelivery ? 'Tele-entrega' : 'Retirada no local'}`,
    ...(isDelivery ? [`Endereço: ${customer.address.trim()}`] : []),
    `Pagamento: ${customer.payment}`,
    '',
    '*Itens:*',
    ...items.map((i) => `• ${i.quantity}x ${i.name} — ${formatBRL(i.price * i.quantity)}`),
    '',
    '──────────────────────',
    `Subtotal: ${formatBRL(subtotal)}`,
    ...(isDelivery ? [`Taxa de entrega: ${formatBRL(fee)}`] : []),
    `*TOTAL: ${formatBRL(total)}*`,
    '──────────────────────',
    '_Aguardando confirmação do pedido._',
  ];

  const digits = store.whatsapp.replace(/\D/g, '');
  // Evita duplicar o DDI 55 caso o número já venha com ele
  const phone = digits.startsWith('55') && digits.length > 11 ? digits : `55${digits}`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`;
}
