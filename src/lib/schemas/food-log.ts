import { z } from "zod";

export const FoodItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  calories: z.number().nonnegative(),
  protein_g: z.number().nonnegative(),
  carbs_g: z.number().nonnegative(),
  fat_g: z.number().nonnegative(),
  fiber_g: z.number().nonnegative(),
});

export const AIFoodAnalysisSchema = z.object({
  items: z.array(FoodItemSchema).min(1),
  total_calories: z.number().nonnegative(),
  total_protein_g: z.number().nonnegative(),
  total_carbs_g: z.number().nonnegative(),
  total_fat_g: z.number().nonnegative(),
  total_fiber_g: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
  meal_type_guess: z.enum([
    "breakfast",
    "lunch",
    "dinner",
    "snack",
    "drink",
    "other",
  ]),
  description: z.string().min(1),
});

export type FoodItem = z.infer<typeof FoodItemSchema>;
export type AIFoodAnalysis = z.infer<typeof AIFoodAnalysisSchema>;

export const ManualEntrySchema = z.object({
  description: z.string().min(1, "Description is required"),
  meal_type: z.enum([
    "breakfast",
    "lunch",
    "dinner",
    "snack",
    "drink",
    "other",
  ]),
  calories: z.coerce.number().nonnegative("Calories must be 0 or more"),
  protein_g: z.coerce.number().nonnegative().default(0),
  carbs_g: z.coerce.number().nonnegative().default(0),
  fat_g: z.coerce.number().nonnegative().default(0),
  fiber_g: z.coerce.number().nonnegative().default(0),
  items: z
    .array(FoodItemSchema)
    .default([])
    .transform((items, ctx) => {
      // If items empty, create a single item from the top-level data
      if (items.length === 0) {
        const parent = ctx as unknown as {
          data: { description: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number };
        };
        // We'll handle this in the form — return empty for now
        return items;
      }
      return items;
    }),
  notes: z.string().optional(),
});

export type ManualEntry = z.infer<typeof ManualEntrySchema>;

export const FoodLogRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  logged_at: z.string(),
  meal_type: z.string().nullable(),
  description: z.string().nullable(),
  items: z.array(FoodItemSchema).default([]),
  calories: z.number().nullable(),
  protein_g: z.number().nullable(),
  carbs_g: z.number().nullable(),
  fat_g: z.number().nullable(),
  fiber_g: z.number().nullable(),
  confidence: z.number().nullable(),
  source: z.string(),
  image_path: z.string().nullable(),
  verified: z.boolean(),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type FoodLogRow = z.infer<typeof FoodLogRowSchema>;
