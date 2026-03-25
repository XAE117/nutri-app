export const FOOD_ANALYSIS_SYSTEM_PROMPT = `You are a nutrition analysis assistant. Your job is to analyze food photos and provide accurate nutritional estimates.

Guidelines:
- Identify all distinct food items visible in the photo
- Estimate portion sizes using visual cues (plate size, utensil scale, hand scale, packaging)
- Provide per-item and total nutritional breakdown
- Set confidence between 0 and 1:
  - 0.9-1.0: Clear photo, recognizable packaged food or standard portions
  - 0.7-0.89: Good photo, identifiable foods but portion estimation uncertain
  - 0.5-0.69: Partially obscured, mixed dishes, or unusual preparations
  - Below 0.5: Very unclear, should rarely happen with reasonable photos
- Guess the meal type based on food content and common eating patterns
- Use standard USDA nutritional data as your reference baseline
- When in doubt, estimate conservatively (slight overestimate rather than under)
- For mixed dishes (casseroles, stir-fries, etc.), break into component ingredients
- Round calories to nearest whole number, macros to one decimal place

Respond ONLY by calling the log_food_analysis tool with the structured data.`;

export const FOOD_ANALYSIS_TOOL = {
  name: "log_food_analysis" as const,
  description:
    "Log the nutritional analysis of a food photo. Call this with the structured breakdown of all food items identified.",
  input_schema: {
    type: "object" as const,
    properties: {
      items: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            name: {
              type: "string" as const,
              description: "Name of the food item",
            },
            quantity: {
              type: "number" as const,
              description: "Numeric quantity",
            },
            unit: {
              type: "string" as const,
              description:
                'Unit of measurement (e.g., "oz", "cup", "piece", "g", "slice")',
            },
            calories: { type: "number" as const, description: "Calories (kcal)" },
            protein_g: { type: "number" as const, description: "Protein in grams" },
            carbs_g: {
              type: "number" as const,
              description: "Carbohydrates in grams",
            },
            fat_g: { type: "number" as const, description: "Fat in grams" },
            fiber_g: { type: "number" as const, description: "Fiber in grams" },
          },
          required: [
            "name",
            "quantity",
            "unit",
            "calories",
            "protein_g",
            "carbs_g",
            "fat_g",
            "fiber_g",
          ],
        },
        description: "Array of identified food items with nutritional data",
      },
      total_calories: {
        type: "number" as const,
        description: "Total calories across all items",
      },
      total_protein_g: {
        type: "number" as const,
        description: "Total protein across all items",
      },
      total_carbs_g: {
        type: "number" as const,
        description: "Total carbs across all items",
      },
      total_fat_g: {
        type: "number" as const,
        description: "Total fat across all items",
      },
      total_fiber_g: {
        type: "number" as const,
        description: "Total fiber across all items",
      },
      confidence: {
        type: "number" as const,
        description: "Confidence score 0-1 in the accuracy of this analysis",
      },
      meal_type_guess: {
        type: "string" as const,
        enum: ["breakfast", "lunch", "dinner", "snack", "drink", "other"],
        description: "Best guess for the meal type",
      },
      description: {
        type: "string" as const,
        description:
          "Brief natural language description of the meal (e.g., 'Grilled chicken breast with rice and steamed broccoli')",
      },
    },
    required: [
      "items",
      "total_calories",
      "total_protein_g",
      "total_carbs_g",
      "total_fat_g",
      "total_fiber_g",
      "confidence",
      "meal_type_guess",
      "description",
    ],
  },
};
