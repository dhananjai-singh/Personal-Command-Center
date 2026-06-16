/**
 * Mock nutrition analyser — faithful port of analyseText/parseSeg/foodDB
 * from Fitness.dc.html.
 *
 * Verify: "i ate 500g soya chunks" → Soya Chunks · 500g · 1725 kcal / P260 / C165 / F3
 * Replace with a real nutrition API + food-recognition service later.
 */

import type { MealDetection } from "@/lib/domain/types";

interface FoodDBEntry {
  per: "100g" | "100ml" | "unit" | "slice";
  cal: number;
  p: number;
  c: number;
  f: number;
  aliases?: string[];
}

const foodDB: Record<string, FoodDBEntry> = {
  "soya chunks": { per: "100g", cal: 345, p: 52, c: 33, f: 0.5, aliases: ["soyachunks","soya chunk","soy chunks","soyabean chunks","soya nuggets","soya"] },
  "chicken breast": { per: "100g", cal: 165, p: 31, c: 0, f: 3.6, aliases: ["chicken"] },
  "paneer": { per: "100g", cal: 265, p: 18, c: 1.2, f: 21, aliases: ["cottage cheese"] },
  "rice": { per: "100g", cal: 130, p: 2.7, c: 28, f: 0.3, aliases: ["cooked rice","white rice","brown rice"] },
  "oats": { per: "100g", cal: 389, p: 17, c: 66, f: 7, aliases: ["oatmeal","rolled oats"] },
  "dal": { per: "100g", cal: 116, p: 9, c: 20, f: 0.4, aliases: ["lentils","daal","cooked dal"] },
  "potato": { per: "100g", cal: 87, p: 2, c: 20, f: 0.1, aliases: ["potatoes","boiled potato","aloo"] },
  "almonds": { per: "100g", cal: 579, p: 21, c: 22, f: 49, aliases: ["almond"] },
  "peanut butter": { per: "100g", cal: 588, p: 25, c: 20, f: 50, aliases: ["peanutbutter"] },
  "yogurt": { per: "100g", cal: 60, p: 10, c: 4, f: 0.4, aliases: ["curd","greek yogurt","dahi"] },
  "milk": { per: "100ml", cal: 42, p: 3.4, c: 5, f: 1, aliases: ["whole milk","toned milk"] },
  "egg": { per: "unit", cal: 78, p: 6, c: 0.6, f: 5, aliases: ["eggs","boiled egg","boiled eggs"] },
  "banana": { per: "unit", cal: 105, p: 1.3, c: 27, f: 0.4, aliases: ["bananas"] },
  "apple": { per: "unit", cal: 95, p: 0.5, c: 25, f: 0.3, aliases: ["apples"] },
  "roti": { per: "unit", cal: 120, p: 3, c: 18, f: 3.7, aliases: ["chapati","chapathi","phulka"] },
  "bread": { per: "slice", cal: 75, p: 3, c: 13, f: 1, aliases: ["toast","slice of bread","bread slice"] },
};

function titleCase(s: string) {
  return (s || "").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function parseSeg(seg: string): { name: string; portion: string; cal: number; p: number; c: number; f: number; est?: boolean } | null {
  let food: FoodDBEntry | null = null;
  let key = "";
  let best = 0;
  for (const k in foodDB) {
    const names = [k, ...(foodDB[k].aliases ?? [])];
    for (const nm of names) {
      if (seg.indexOf(nm) !== -1 && nm.length > best) {
        best = nm.length;
        food = foodDB[k];
        key = k;
      }
    }
  }
  if (!food) return null;

  const wm = seg.match(/(\d+(?:\.\d+)?)\s*(kgs?|kilograms?|kilo|grams?|gms?|gm|g)\b/);
  const vm = seg.match(/(\d+(?:\.\d+)?)\s*(milliliters?|millilitres?|ml|liters?|litres?|l)\b/);
  const cupm = seg.match(/(\d+(?:\.\d+)?)\s*(cups?|bowls?)\b/);
  const cntm = seg.match(/(\d+(?:\.\d+)?)/);

  let factor = 1;
  let portion = "1 serving";

  if (food.per === "100g") {
    let grams = 100;
    if (wm) grams = parseFloat(wm[1]) * (/^k/.test(wm[2]) ? 1000 : 1);
    else if (cupm) grams = parseFloat(cupm[1]) * (/bowl/.test(cupm[2]) ? 250 : 200);
    factor = grams / 100;
    portion = Math.round(grams) + "g";
  } else if (food.per === "100ml") {
    let ml = 100;
    if (vm) ml = parseFloat(vm[1]) * (/^l/.test(vm[2]) ? 1000 : 1);
    else if (cupm) ml = parseFloat(cupm[1]) * 240;
    factor = ml / 100;
    portion = Math.round(ml) + "ml";
  } else {
    const count = cntm ? parseFloat(cntm[1]) : 1;
    factor = count;
    portion = food.per === "slice"
      ? count + (count > 1 ? " slices" : " slice")
      : count + "×";
  }

  return {
    name: titleCase(key),
    portion,
    cal: Math.round(food.cal * factor),
    p: Math.round(food.p * factor),
    c: Math.round(food.c * factor),
    f: Math.round(food.f * factor),
  };
}

export function analyseText(raw: string): MealDetection {
  const clean = raw
    .toLowerCase()
    .replace(/^(i\s+(just\s+)?(ate|had|having|grabbed)|ate|had|just\s+ate|i'?ve\s+had)\s+/, "")
    .trim();

  const segs = clean
    .split(/\s*(?:,|\band\b|\+|&|\bwith\b|\bplus\b)\s*/)
    .filter(Boolean);

  const items: MealDetection["items"] = [];
  segs.forEach((seg) => {
    const it = parseSeg(seg);
    if (it) items.push(it);
  });

  if (!items.length) {
    items.push({ name: titleCase(clean) || "Meal", portion: "~1 serving", cal: 250, p: 10, c: 30, f: 9, est: true });
  }

  const total = items.reduce((a, b) => a + b.cal, 0);
  const p = items.reduce((a, b) => a + b.p, 0);
  const c = items.reduce((a, b) => a + b.c, 0);
  const f = items.reduce((a, b) => a + b.f, 0);
  const name = items.length === 1 ? items[0].name : items.map((i) => i.name).join(" + ");

  return {
    name,
    conf: items.some((i) => i.est) ? 64 : 96,
    items,
    total,
    p,
    c,
    f,
    time: "Now",
  };
}
