import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Product, Store, StoreProduct } from './types';

type Status = 'loading' | 'ready' | 'not-found' | 'error';

export interface SavePatch {
  is_active?: boolean;
  custom_price?: number;
}

export function useStoreData(slug: string) {
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setStatus('loading');
      try {
        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .maybeSingle();

        if (storeError) throw storeError;
        if (!storeData) {
          if (!cancelled) setStatus('not-found');
          return;
        }

        const [productsRes, storeProductsRes] = await Promise.all([
          supabase.from('products').select('*'),
          supabase.from('store_products').select('*').eq('store_id', storeData.id),
        ]);

        if (productsRes.error) throw productsRes.error;
        if (storeProductsRes.error) throw storeProductsRes.error;
        if (cancelled) return;

        setStore(storeData as Store);
        setProducts((productsRes.data ?? []) as Product[]);
        setStoreProducts((storeProductsRes.data ?? []) as StoreProduct[]);
        setStatus('ready');
      } catch (err) {
        console.error('Erro ao carregar loja:', err);
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const fetchStoreProducts = useCallback(async (storeId: string) => {
    const { data, error } = await supabase
      .from('store_products')
      .select('*')
      .eq('store_id', storeId);
    if (error) throw error;
    setStoreProducts((data ?? []) as StoreProduct[]);
  }, []);

  /**
   * Cria ou atualiza o vínculo loja↔produto.
   * Usa o registro existente (inclusive inativo) para evitar duplicatas.
   */
  const saveStoreProduct = useCallback(
    async (product: Product, existing: StoreProduct | undefined, patch: SavePatch) => {
      if (!store) throw new Error('Loja não carregada');

      const request = existing
        ? supabase.from('store_products').update(patch).eq('id', existing.id)
        : supabase.from('store_products').insert({
            store_id: store.id,
            product_id: product.id,
            custom_price: patch.custom_price ?? Number(product.price),
            is_active: patch.is_active ?? true,
          });

      const { error } = await request;
      if (error) throw error;

      await fetchStoreProducts(store.id);
    },
    [store, fetchStoreProducts]
  );

  return { store, products, storeProducts, status, saveStoreProduct };
}
