import { listBrands, saveBrand } from "./db";
import type { Brand } from "./types";

/** Seeds one demo brand the first time the app starts, so the Studio is usable immediately. */
export function ensureSeedBrand(): void {
  if (listBrands().length > 0) return;
  const brand: Brand = {
    id: "demo-northwind",
    name: "Northwind Coffee",
    tagline: "Slow mornings, bold beans.",
    colors: ["#1F3A2E", "#E8B04B", "#F6F1E7"],
    fonts: "Serif display headlines, clean sans-serif body text",
    tone: "Warm, confident, unhurried. Speaks like a friendly barista, never salesy.",
    useWords: "small-batch, roasted, morning, craft",
    avoidWords: "cheap, discount, instant, revolutionary",
    notes: "Products: House Blend (medium roast), Single Origin Ethiopia (light roast). Packaging is kraft paper with forest green labels.",
    logo: null,
    updatedAt: Date.now(),
  };
  saveBrand(brand);
}
