export interface OFFProduct {
  product_name: string;
  brands?: string;
  serving_size?: string;
  nutriments: {
    "energy-kcal_100g"?: number;
    "energy-kcal_serving"?: number;
    proteins_100g?: number;
    proteins_serving?: number;
    carbohydrates_100g?: number;
    carbohydrates_serving?: number;
    fat_100g?: number;
    fat_serving?: number;
    fiber_100g?: number;
    fiber_serving?: number;
  };
  image_url?: string;
}

export interface OFFResult {
  found: boolean;
  product?: OFFProduct;
  error?: string;
}

export async function lookupBarcode(code: string): Promise<OFFResult> {
  const res = await fetch(
    `https://world.openfoodfacts.net/api/v2/product/${encodeURIComponent(code)}?fields=product_name,brands,serving_size,nutriments,image_url`,
    { next: { revalidate: 86400 } }
  );

  if (!res.ok) {
    return { found: false, error: `API returned ${res.status}` };
  }

  const data = await res.json();

  if (data.status !== 1 || !data.product) {
    return { found: false, error: "Product not found" };
  }

  return { found: true, product: data.product as OFFProduct };
}
