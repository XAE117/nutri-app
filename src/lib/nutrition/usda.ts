export interface USDAFood {
  fdcId: number;
  description: string;
  brandName?: string;
  dataType: string;
  nutrients: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
  };
  servingSize?: number;
  servingSizeUnit?: string;
}

interface USDANutrient {
  nutrientId: number;
  value: number;
}

interface USDAFoodResult {
  fdcId: number;
  description: string;
  brandName?: string;
  dataType: string;
  foodNutrients: USDANutrient[];
  servingSize?: number;
  servingSizeUnit?: string;
}

// Nutrient IDs: 1008=Energy, 1003=Protein, 1005=Carbs, 1004=Fat, 1079=Fiber
function extractNutrients(foodNutrients: USDANutrient[]) {
  const get = (id: number) =>
    foodNutrients.find((n) => n.nutrientId === id)?.value ?? 0;

  return {
    calories: Math.round(get(1008)),
    protein_g: Math.round(get(1003) * 10) / 10,
    carbs_g: Math.round(get(1005) * 10) / 10,
    fat_g: Math.round(get(1004) * 10) / 10,
    fiber_g: Math.round(get(1079) * 10) / 10,
  };
}

export async function searchFood(query: string): Promise<USDAFood[]> {
  const apiKey = process.env.USDA_API_KEY || "DEMO_KEY";
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=15&api_key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`USDA API returned ${res.status}`);
  }

  const data = await res.json();
  const foods: USDAFood[] = (data.foods ?? []).map((f: USDAFoodResult) => ({
    fdcId: f.fdcId,
    description: f.description,
    brandName: f.brandName,
    dataType: f.dataType,
    nutrients: extractNutrients(f.foodNutrients),
    servingSize: f.servingSize,
    servingSizeUnit: f.servingSizeUnit,
  }));

  return foods;
}
