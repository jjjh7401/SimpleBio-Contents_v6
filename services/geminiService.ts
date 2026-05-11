
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT, COMPOSITION_SYSTEM_PROMPT, Category, AppMode, ProductImage } from "../types";
import { fileToGenerativePart, urlToGenerativePart } from "../utils";

const getPartFromProductImage = async (img: ProductImage) => {
  if (img.type === 'file') {
    return {
      inlineData: {
        mimeType: (img.data as File).type,
        data: await fileToGenerativePart(img.data as File),
      },
    };
  } else {
    const extension = (img.data as string).split('.').pop()?.toLowerCase();
    const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';
    return {
      inlineData: {
        mimeType: mimeType,
        data: await urlToGenerativePart(img.data as string),
      },
    };
  }
};

export const suggestBackgroundColor = async (productImage: ProductImage): Promise<string> => {
  const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const productPart = await getPartFromProductImage(productImage);

  const prompt = `Analyze the dominant color of this product. 
  Suggest a hex color code (#xxxxxx) for a background that is:
  1. A very light, bright, and desaturated version (pastel/tint) of the dominant hue.
  2. Professional and clean for a commercial studio shot.
  Respond ONLY with the hex code string (e.g., #F0F8FF).`;

  try {
    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        role: "user",
        parts: [productPart, { text: prompt }],
      },
      config: { temperature: 0 },
    });
    const text = response.text?.trim() || "#f8f9fa";
    const hexMatch = text.match(/#[0-9A-Fa-f]{6}/);
    return hexMatch ? hexMatch[0] : "#f8f9fa";
  } catch (error) {
    return "#f8f9fa";
  }
};

export const generateRefinedPrompt = async (
  productImages: ProductImage[], 
  referenceFiles: File[],
  category: Category, 
  concept: string, 
  refUrls: string[],
  activeMode: AppMode,
  bgFiles?: File[],
  bgColor?: string,
  quantities?: { product1: number; product2: number; product3: number }
): Promise<string> => {
  if (productImages.length === 0) throw new Error("No image uploaded");

  // @ts-ignore
  if (window.aistudio && window.aistudio.openSelectKey) {
      // @ts-ignore
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
      }
  }

  const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const labeledProductParts: any[] = [];
  let labelSection = "";

  for (let i = 0; i < productImages.length; i++) {
    const img = productImages[i];
    labeledProductParts.push({ text: `[ABSOLUTE VISUAL REFERENCE FOR PRODUCT_${i + 1}]` });
    labeledProductParts.push(await getPartFromProductImage(img));
    
    if (img.labelInfo) {
      labelSection += `
- **PRODUCT_${i + 1} (${img.labelInfo.productName}):**
    - **BOX LABEL:** Text MUST read "${img.labelInfo.boxLabel}".
    - **BOTTLE LABEL:** Text MUST read "${img.labelInfo.bottleLabel}".
    - **PRODUCT COLORS/MATERIALS:** Inherit exactly from [ABSOLUTE VISUAL REFERENCE FOR PRODUCT_${i + 1}].
`;
    }
  }

  const allReferenceParts = await Promise.all([
    ...referenceFiles.map(async (file) => ({
      inlineData: { mimeType: file.type, data: await fileToGenerativePart(file) },
    })),
    ...refUrls.map(async (url) => {
      const mimeType = url.split('.').pop()?.toLowerCase() === 'png' ? 'image/png' : 'image/jpeg';
      return { inlineData: { mimeType, data: await urlToGenerativePart(url) } };
    })
  ]);

  const bgImageParts = bgFiles ? await Promise.all(
    bgFiles.map(async (file, idx) => ({
      text: `[BACKGROUND SOURCE ${idx + 1}]`,
      inlineData: { mimeType: file.type, data: await fileToGenerativePart(file) },
    }))
  ).then(parts => parts.flatMap(p => [ {text: p.text}, {inlineData: p.inlineData} ])) : [];

  if (activeMode === AppMode.BEAUTY) {
    const instructionText = `
[TASK]: GENERATE A HIGH-END COMMERCIAL PRODUCT PHOTOGRAPHY PROMPT.
[MANDATORY REQUIREMENT]: THE PRODUCT DESIGN AND LABELS MUST NEVER CHANGE.

Your response MUST follow this exact structure:

**[PROMPT]**
(Commercial Product Photography:1.5), [Brand/Product Set Name], (Shot Type), (Lighting Description), 8k resolution, highly detailed, photorealistic, advertising standard.

**[Subject & Composition]**
- **Layout:** [Describe arrangement, e.g., on a hexagonal podium, side-by-side, etc.].
- **Product Appearance (Strict Fidelity):**
    - **Box:** [Color/Shape description]. Text MUST read "[Exact Box Label Text from Data]".
    - **Bottle:** [Material/Cap/Color description]. Label text MUST read "[Exact Bottle Label Text from Data]".
    - **Pill:** [Color/Shape/Texture description].
- **Scale & Ratio:** MANDATORY: Box (9cm height), Bottle (8.8cm height), Pill (1cm width). Ratio 9:8.8:1.

**[Environment & Lighting]**
- **Background:** [Describe gradient, surface, and mood from Style Reference].
- **Props & Effects:** [Describe additional elements, sparkles, light rings, etc.].
- **Lighting:** [Describe rim lighting, backlighting, and front fill].

**[Negative Prompt]**
(distorted text, illegible labels, wrong aspect ratio, floating products without shadow, matte finish on bottle if it is glossy glass, low resolution, blurry pill, spelling errors, incorrect product color).

---

**[COMPOSITION MAP]**
[Provide a visual ASCII or diagrammatic map of the setup].

**CRITICAL DATA:**
- Reference [STYLE REFERENCE] for atmosphere and lighting only.
- PRODUCT IDENTITY: Follow [ABSOLUTE VISUAL REFERENCE] exactly.
- CONCEPT: "${concept}"

**LABEL DATA (USE EXACTLY):**
${labelSection}
`;

    const response = await genAI.models.generateContent({
      model: "gemini-3-pro-preview", 
      contents: {
        role: "user",
        parts: [...labeledProductParts, { text: "[STYLE REFERENCE]" }, ...allReferenceParts, { text: instructionText }],
      },
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.1, 
        thinkingConfig: { thinkingBudget: 16000 } 
      },
    });
    return response.text || "Failed to generate prompt.";

  } else {
    // COMPOSITION MODE
    const q1 = quantities?.product1 || 0;
    const q2 = quantities?.product2 || 0;
    const q3 = quantities?.product3 || 0;
    const total = q1 + q2 + q3;

    const layoutInstruction = total > 5 
      ? "Arrange units in TWO TIERS using clear acrylic stands for elevation (Stadium Grid Layout). The back row must be visually lifted higher than the front row."
      : "Arrange all units in a SINGLE HORIZONTAL ROW side-by-side on the table surface.";

    const instructionText = `
[TASK]: GENERATE A TABLETOP PRODUCT COMPOSITION PROMPT (COMMERCIAL E-COMMERCE STYLE).
[MANDATORY]: USE SET-BASED RENDERING.

Every uploaded product photo defines a COMPLETE SET (e.g., Box + Bottle).
You MUST render exactly the quantities specified below.

**QUANTITIES TO RENDER:**
- PRODUCT_1: ${q1} sets
- PRODUCT_2: ${q2} sets
- PRODUCT_3: ${q3} sets
- TOTAL: ${total} complete sets

**LAYOUT STRATEGY:**
- ${layoutInstruction}
- All sets must be clearly visible with ZERO occlusion.
- Background Color: ${bgColor || '#f0f0f0'}.
- No additional components (like pills) unless they are in the source 'Product Photos'.

Your response MUST follow this exact structure:

**[PROMPT]**
(Commercial Product Photography:1.5), SimpleBio Composition Shot, (Eye-Level Front View), (High-Key Studio Lighting), 8k resolution, highly detailed, photorealistic, advertising standard.

**[Subject & Composition]**
- **Layout:** [Describe the exact ${total}-set arrangement based on the layout strategy].
- **Set Integrity:** Every set must include all components from its source image (e.g., box + bottle).
- **Product Appearance:** [Strictly match visual source color/material]. Text for labels must match provided data.
- **Occlusion:** NONE. Every label must be 100% readable.

**[Environment & Lighting]**
- **Background:** Clean studio setting, hex color ${bgColor || '#f0f0f0'}.
- **Surface:** A professional tabletop with soft contact shadows.
- **Lighting:** Even, high-key studio lighting for maximum clarity.

**[Negative Prompt]**
(occlusion, hidden labels, missing components, artistic blur, dramatic shadows, floating products, incorrect quantity, extra pills, low resolution, messy arrangement).

---

**[COMPOSITION MAP]**
[Detailed ASCII map showing the tiered or single-row layout of the ${total} sets].

**LABEL DATA (USE EXACTLY):**
${labelSection}
`;

    const response = await genAI.models.generateContent({
      model: "gemini-3-pro-preview", 
      contents: {
        role: "user",
        parts: [...labeledProductParts, ...bgImageParts, { text: instructionText }],
      },
      config: {
        systemInstruction: COMPOSITION_SYSTEM_PROMPT,
        temperature: 0.1, 
        thinkingConfig: { thinkingBudget: 16000 } 
      },
    });
    return response.text || "Failed to generate prompt.";
  }
};

export const generatePreviewImage = async (
  productImages: ProductImage[],
  referenceFiles: File[],
  prompt: string
): Promise<string> => {
  const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const labeledProductParts: any[] = [];
  for (let i = 0; i < productImages.length; i++) {
    const img = productImages[i];
    labeledProductParts.push({ text: `[ABSOLUTE IDENTITY SOURCE FOR PRODUCT_${i + 1}]` });
    labeledProductParts.push(await getPartFromProductImage(img));
  }

  const manifest = `[ABSOLUTE MANDATE: ZERO DEVIATION FROM PRODUCT SOURCE IDENTITY]: 
- RETAIN ALL VISUAL DETAILS, LABELS, AND SHAPES FROM [ABSOLUTE IDENTITY SOURCE] WITH 100% CONSISTENCY.
- DO NOT STYLIZE THE PRODUCT. DO NOT CHANGE LABEL TEXT.
- SCALE: Maintain the relative size and set integrity from source photos.
\n${prompt}`;

  try {
    const response = await genAI.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: { parts: [...labeledProductParts, { text: manifest }] },
      config: { imageConfig: { aspectRatio: "16:9", imageSize: "2K" } }
    });
    for (const candidate of response.candidates || []) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image found");
  } catch (error) { throw error; }
};

export const generateFinalImage = async (
  productImages: ProductImage[],
  prompt: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const labeledProductParts: any[] = [];
  for (let i = 0; i < productImages.length; i++) {
    const img = productImages[i];
    labeledProductParts.push({ text: `[ABSOLUTE MASTER BRAND SOURCE PRODUCT_${i + 1}]` });
    labeledProductParts.push(await getPartFromProductImage(img));
  }

  const proHeader = `
    [MISSION: 4K COMMERCIAL MASTERPIECE - ABSOLUTE PRODUCT CONSISTENCY]
    - MANDATORY RULE: 100% IDENTITY FIDELITY WITH [ABSOLUTE MASTER BRAND SOURCE].
    - NO MODIFICATION OF PRODUCT SHAPE, LABEL TEXT, OR COLOR.
    - SCALE: Maintain accurate relative sizing and set integrity.
    - PROMPT:
    ${prompt}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: { parts: [...labeledProductParts, { text: proHeader }] },
      config: { imageConfig: { aspectRatio: "16:9", imageSize: "4K" } }
    });
    for (const candidate of response.candidates || []) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image found");
  } catch (error) { throw error; }
};

export const editImage = async (
  originalBase64: string,
  markedUpBase64: string,
  prompt: string,
  imageType: 'preview' | 'final'
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const getInlineData = (base64: string) => {
    const parts = base64.split(',');
    const mimeType = parts[0].split(':')[1].split(';')[0];
    const data = parts[1];
    return { inlineData: { mimeType, data } };
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: {
        parts: [
          getInlineData(originalBase64),
          getInlineData(markedUpBase64),
          { text: `[IMAGE EDITING MISSION]:
1. The first image is the CLEAN ORIGINAL image.
2. The second image has RED MARKS (boxes or brush strokes) that indicate the specific areas to be edited.
3. YOUR TASK: Modify the ORIGINAL image according to this request: "${prompt}".
4. FOCUS: Apply changes ONLY to the areas marked in red on the second image.
5. QUALITY: The final output must be photorealistic and maintain absolute consistency for all unmarked areas.
6. MANDATORY: The final output MUST NOT contain any red marks, red boxes, or red brush strokes. These are purely for selection.
7. IDENTITY: Do not alter the product's visual identity.` },
        ],
      },
      config: {
        imageConfig: { 
          aspectRatio: "16:9", 
          imageSize: imageType === 'final' ? "4K" : "2K" 
        },
      }
    });
    for (const candidate of response.candidates || []) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image found");
  } catch (error) { throw error; }
};

export const expandImage = async (
  originalBase64: string,
  imageType: 'preview' | 'final'
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const getInlineData = (base64: string) => {
    const parts = base64.split(',');
    const mimeType = parts[0].split(':')[1].split(';')[0];
    const data = parts[1];
    return { inlineData: { mimeType, data } };
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: {
        parts: [
          getInlineData(originalBase64),
          { text: `[OUTPAINTING MISSION]:
1. Perform high-end AI Outpainting to expand the background of this image.
2. MANDATORY: KEEP the original content and pixels exactly as they are in the center. Do not modify the product or existing details.
3. TASK: Extend the environment outwards into a wider 16:9 composition.
4. DETAIL: The expanded areas should be simple, clean, and minimalist to make it suitable for a luxury brand landing page.
5. QUALITY: Seamlessly match the lighting, colors, and material textures of the original image.` },
        ],
      },
      config: {
        imageConfig: { 
          aspectRatio: "16:9", 
          imageSize: imageType === 'final' ? "4K" : "2K" 
        },
      }
    });
    for (const candidate of response.candidates || []) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image found during expansion");
  } catch (error) { throw error; }
};
