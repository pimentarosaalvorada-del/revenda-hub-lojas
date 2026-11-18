export type DeliveryType = 'delivery' | 'pickup';
export type PaymentMethod = 'PIX' | 'Cartão de Crédito' | 'Dinheiro';

export interface Store {
  id: string;
  slug: string;
  name: string;
  whatsapp: string;
  primary_color: string | null;
  accent_color: string | null;
  delivery_fee: number | null;
  is_active: boolean;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  barcode: string | null;
}

export interface StoreProduct {
  id: string;
  store_id: string;
  product_id: string;
  custom_price: number;
  is_active: boolean;
}

/** Item visível na vitrine (produto central + preço do revendedor) */
export interface CatalogItem {
  storeProductId: string;
  productId: string;
  name: string;
  price: number;
  stock: number;
  barcode: string | null;
}

export interface CartItem extends CatalogItem {
  quantity: number;
}

export interface CustomerData {
  name: string;
  address: string;
  payment: PaymentMethod;
}
