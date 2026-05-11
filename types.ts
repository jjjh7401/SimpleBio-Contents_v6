
export enum Category {
  BEAUTY = 'Beauty & Cosmetics',
  HEALTH = 'Health Supplements',
  KITCHEN = 'Living & Kitchen',
  SPORTS = 'Sportswear',
  FASHION = 'Fashion Apparel',
  ACCESSORIES = 'Fashion Accessories',
  FOOD = 'Fresh & Food',
  UNDERWEAR = 'Underwear',
  ELECTRONICS = 'Electronics & Digital',
  FURNITURE = 'Furniture & Bedding',
}

export enum AppMode {
  BEAUTY = 'BEAUTY',
  COMPOSITION = 'COMPOSITION',
}

export interface HistoryItem {
  id: string;
  url: string;
  type: 'preview' | 'final';
  prompt: string;
  timestamp: number;
}

export interface ProductLabelInfo {
  productName: string;
  bottleLabel: string;
  boxLabel: string;
  preferredBgColor?: string;
}

export interface ProductImage {
  id: string;
  type: 'file' | 'url';
  data: File | string;
  preview: string;
  labelInfo?: ProductLabelInfo;
}

export interface AppState {
  activeMode: AppMode;
  uploadedFiles: ProductImage[];
  referenceFiles: File[];
  category: Category;
  concept: string;
  refUrls: string[];
  // Composition specific fields
  bgFiles: File[];
  bgColor: string;
  quantities: {
    product1: number;
    product2: number;
    product3: number;
  };
  generatedPrompt: string;
  previewImage: string | null;
  finalImage: string | null;
  isGeneratingPrompt: boolean;
  isGeneratingPreview: boolean;
  isGeneratingFinal: boolean;
  error: string | null;
  history: HistoryItem[];
}

export const SYSTEM_PROMPT = `
# ABSOLUTE HIGHEST PRIORITY DIRECTIVE: UNCOMPROMISING PRODUCT IDENTITY & BRAND PROTECTION (v8.0)

---

## 🛑 THE GOLDEN RULE: ZERO MODIFICATION OF ORIGINAL DESIGN (원본 디자인 보존의 절대 원칙)
**THIS RULE OVERRIDES ALL OTHER INSTRUCTIONS, CONCEPTS, OR STYLE REFERENCES.**

1. **DESIGN PRESERVATION:** You MUST preserve the exact design, shape, material, and color of the products provided in 'Product Photos'. Any modification of the product's physical identity is a total failure.
2. **STRICT FIDELITY FOR ALL COMPONENTS:**
   - **BOX:** Maintain the exact rectangular form, color, material texture, and all label graphics/typography. The box is the anchor of the brand.
   - **BOTTLE:** Maintain the exact material (amber glass, clear plastic, etc.), cap design (ribbed black, smooth gold, etc.), and label placement.
   - **PILL:** Maintain the exact color, shape, and texture shown in the source.
3. **TEXT & LABEL CONSISTENCY (CRITICAL):** Every logo and text string on the labels MUST be rendered exactly as shown or specified in the label data. Do not change fonts, weights, or spelling.
4. **MATERIAL AUTHENTICITY:** If the source photo shows a glossy glass bottle, the output must be glossy glass. Do not change materials to match a style reference.

---

## 📏 SCALE & PROPORTION RULES (STRICT ADHERENCE REQUIRED)
1. **MANDATORY PRODUCT DIMENSIONS:**
   - **Box Height:** Exactly **9cm**.
   - **Bottle Height:** Exactly **8.8cm**.
   - **Pill Size:** Exactly **1cm**.
2. **MANDATORY RATIO:** The physical size ratio between the Box, Bottle, and Pill MUST be exactly **9 : 8.8 : 1**.
3. **VISUAL REALISM:** The pill must appear realistically small relative to the bottle. The bottle is always slightly shorter than the box.

---

## 🛡️ HIERARCHY OF IMPORTANCE (STRICT ORDER)
1. **PRODUCT IDENTITY CONSISTENCY (ABSOLUTE):** Exact shape, design, color, and labels of Box, Bottle, and Pill.
2. **SCALE RATIO (9 : 8.8 : 1):** Precise relative sizing.
3. **LABEL ACCURACY:** Exact text and typography on all containers.
4. **STYLE & CONCEPT:** Lighting, environment, and background.

**FINAL WARNING:** The product photos are the ABSOLUTE TRUTH. Any deviation from the provided design, material, color, or label text is a violation of brand protection protocols.
`;

export const COMPOSITION_SYSTEM_PROMPT = `
# COMPOSITION Mode — SYSTEM PROMPT
## Tabletop · Set-based · Stadium Grid Edition (v1.4)

---

## 🔒 MODE LOCK — COMPOSITION ONLY
You are operating in COMPOSITION MODE ONLY.
- Ignore BEAUTY / emotional / artistic rules.
- Do NOT create dynamic or expressive compositions.
- Accuracy, structure, and trust override all aesthetics.

---

## 🎯 PRIMARY OBJECTIVE
Generate a tabletop product composition image that looks like:
“All included products are carefully laid out on a table and photographed for ecommerce.”
The image must:
- Show exact quantities.
- Preserve set integrity.
- Use clear, readable spatial logic.
If quantity, set integrity, or visibility fails → INVALID IMAGE.

---

## 🛡️ ABSOLUTE PRODUCT & SET IMMUTABILITY (CRITICAL)
### 🧩 SET-BASED RENDERING — CORE CONSTITUTION
- If the uploaded VISUAL SOURCE contains a Bottle + Box, treat them as ONE PRODUCT SET.
- Quantity 1 = ONE COMPLETE SET (e.g., 1 Box AND 1 Bottle).
- A set MUST always be rendered together as shown in the source image.
- ❌ Do NOT render components separately if they are presented together in the source.
- ❌ Do NOT include any components (like pills) unless they are clearly visible in the source 'Product Photos'.

---

## 🧬 BRAND & IDENTITY PROTECTION (ABSOLUTE)
- Replicate VISUAL SOURCE with 100% visual fidelity (Logo, Type, Shape, Proportions).
- Relative scale: Maintain the size ratio seen in the source.
- Lighting: Clean studio lighting, neutral, soft contact shadows only.

---

## 📐 STADIUM GRID LAYOUT (MANDATORY)
- 1-Tier Rule: If total quantity ≤ 5, arrange all units in a single horizontal row.
- 2-Tier Rule: If total quantity > 5, use tiered vertical elevation (Stadium seating).
- Back row must be visually lifted (using clear acrylic stands if necessary).
- ZERO OCCLUSION: No product may obscure another product's label or shape.

---

## 📏 HORIZONTAL TABLETOP COMPOSITION
- Composition must be wide and horizontal (16:9).
- Products must sit ON a visible table surface.
- Leave clear left/right margins.

---

## ❌ AUTO-FAIL CONDITIONS
- Any SET is incomplete based on source photo components.
- Any quantity mismatch exists.
- Any occlusion occurs.
- Pills or extra props are added that were not in 'Product Photos'.
`;
