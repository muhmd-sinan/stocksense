// Parser eval set: what a shop owner might type, and the confirmation lines we expect.
// Scored end to end (parse → resolve against the seed catalog), so matching counts too.
// `item: null` means the right answer is to ask (ambiguous or unknown), not to guess.
// Expectations are written from the owner's point of view, not from what the parser does today.

export type ExpectedLine =
  | { type: "sale" | "restock"; item: string | null; quantity: number | null }
  | { type: "update_threshold"; item: string | null; threshold: number | null }
  | { type: "create_item"; name: string; quantity?: number; price?: number | null };

export type EvalCase = { tag: string; text: string; expect: ExpectedLine[] };

export const CASES: EvalCase[] = [
  // Plain English
  { tag: "basic", text: "sold 2 matta rice", expect: [{ type: "sale", item: "Matta Rice 5kg", quantity: 2 }] },
  { tag: "basic", text: "sold 3 sugar", expect: [{ type: "sale", item: "Sugar 1kg", quantity: 3 }] },
  { tag: "basic", text: "got 10 coconut oil", expect: [{ type: "restock", item: "Coconut Oil 1L", quantity: 10 }] },
  { tag: "basic", text: "received 24 milma milk", expect: [{ type: "restock", item: "Milma Milk 500ml", quantity: 24 }] },
  { tag: "basic", text: "sold one horlicks", expect: [{ type: "sale", item: "Horlicks 500g", quantity: 1 }] },
  { tag: "basic", text: "sold a dozen parle-g", expect: [{ type: "sale", item: "Parle-G 250g", quantity: 12 }] },
  { tag: "basic", text: "toor dal x4", expect: [{ type: "sale", item: "Toor Dal 1kg", quantity: 4 }] },
  { tag: "basic", text: "2 bru coffee", expect: [{ type: "sale", item: "Bru Coffee 100g", quantity: 2 }] },
  { tag: "basic", text: "sold 2 packets of good day", expect: [{ type: "sale", item: "Good Day 200g", quantity: 2 }] },
  { tag: "basic", text: "sold 1 colgate for 55", expect: [{ type: "sale", item: "Colgate 100g", quantity: 1 }] },

  // Typos and spelling variants
  { tag: "typo", text: "sold 2 suger", expect: [{ type: "sale", item: "Sugar 1kg", quantity: 2 }] },
  { tag: "typo", text: "sold 3 cocnut oil", expect: [{ type: "sale", item: "Coconut Oil 1L", quantity: 3 }] },
  { tag: "typo", text: "sold 1 horliks", expect: [{ type: "sale", item: "Horlicks 500g", quantity: 1 }] },
  { tag: "typo", text: "sold 2 medimix soaps", expect: [{ type: "sale", item: "Medimix Soap 125g", quantity: 2 }] },
  { tag: "typo", text: "sold 4 coca cola", expect: [{ type: "sale", item: "Coca-Cola 750ml", quantity: 4 }] },
  { tag: "typo", text: "sold 2 banana chip", expect: [{ type: "sale", item: "Banana Chips 200g", quantity: 2 }] },

  // Manglish
  { tag: "manglish", text: "randu sugar vittu", expect: [{ type: "sale", item: "Sugar 1kg", quantity: 2 }] },
  { tag: "manglish", text: "matta rice moonu vittu", expect: [{ type: "sale", item: "Matta Rice 5kg", quantity: 3 }] },
  { tag: "manglish", text: "pathu milma milk vannu", expect: [{ type: "restock", item: "Milma Milk 500ml", quantity: 10 }] },
  { tag: "manglish", text: "oru tea powder koduthu", expect: [{ type: "sale", item: "Tea Powder 250g", quantity: 1 }] },
  { tag: "manglish", text: "anchu puttu podi vangi", expect: [{ type: "restock", item: "Puttu Podi 1kg", quantity: 5 }] },

  // Several items in one entry
  {
    tag: "multi",
    text: "sold 2 sugar, 1 tea powder and 3 parle-g",
    expect: [
      { type: "sale", item: "Sugar 1kg", quantity: 2 },
      { type: "sale", item: "Tea Powder 250g", quantity: 1 },
      { type: "sale", item: "Parle-G 250g", quantity: 3 },
    ],
  },
  {
    tag: "multi",
    text: "sugar 2, rava 1",
    expect: [
      { type: "sale", item: "Sugar 1kg", quantity: 2 },
      { type: "sale", item: "Rava 500g", quantity: 1 },
    ],
  },
  {
    tag: "multi",
    text: "sold 2 vim bar\ngot 20 lifebuoy soap",
    expect: [
      { type: "sale", item: "Vim Bar 200g", quantity: 2 },
      { type: "restock", item: "Lifebuoy Soap 125g", quantity: 20 },
    ],
  },
  {
    tag: "multi",
    text: "sold 1 surf excel; 2 clinic plus shampoo",
    expect: [
      { type: "sale", item: "Surf Excel 1kg", quantity: 1 },
      { type: "sale", item: "Clinic Plus Shampoo 175ml", quantity: 2 },
    ],
  },

  // Missing quantity: the card should ask
  { tag: "missing_qty", text: "sold sugar", expect: [{ type: "sale", item: "Sugar 1kg", quantity: null }] },
  { tag: "missing_qty", text: "got some achappam", expect: [{ type: "restock", item: "Achappam 250g", quantity: null }] },
  { tag: "missing_qty", text: "sold lays", expect: [{ type: "sale", item: "Lays Classic 52g", quantity: null }] },

  // Ambiguous or unknown: the card should ask, not guess
  { tag: "ambiguous", text: "sold 2 rice", expect: [{ type: "sale", item: null, quantity: 2 }] },
  { tag: "ambiguous", text: "sold 1 soap", expect: [{ type: "sale", item: null, quantity: 1 }] },
  { tag: "ambiguous", text: "sold 2 maggi", expect: [{ type: "sale", item: null, quantity: 2 }] },

  // Harder: everyday names, no separators, mixed verbs
  { tag: "hard", text: "sold 2 coke", expect: [{ type: "sale", item: "Coca-Cola 750ml", quantity: 2 }] },
  { tag: "hard", text: "sold 1 chaya podi", expect: [{ type: "sale", item: "Tea Powder 250g", quantity: 1 }] },
  {
    tag: "hard",
    text: "sugar 2 rava 1 parle-g 3",
    expect: [
      { type: "sale", item: "Sugar 1kg", quantity: 2 },
      { type: "sale", item: "Rava 500g", quantity: 1 },
      { type: "sale", item: "Parle-G 250g", quantity: 3 },
    ],
  },
  {
    tag: "hard",
    text: "sold 2 sugar and got 30 matta rice",
    expect: [
      { type: "sale", item: "Sugar 1kg", quantity: 2 },
      { type: "restock", item: "Matta Rice 5kg", quantity: 30 },
    ],
  },
  { tag: "hard", text: "got 2 boxes of colgate", expect: [{ type: "restock", item: "Colgate 100g", quantity: 2 }] },
  { tag: "hard", text: "customer took 3 kerala mixture", expect: [{ type: "sale", item: "Kerala Mixture 200g", quantity: 3 }] },
  { tag: "hard", text: "2 kg sugar sold", expect: [{ type: "sale", item: "Sugar 1kg", quantity: 2 }] },

  // Pack size in the text
  { tag: "size", text: "sold 2 sunflower oil 1l", expect: [{ type: "sale", item: "Sunflower Oil 1L", quantity: 2 }] },
  { tag: "size", text: "sold 3 wheat atta 1 kg", expect: [{ type: "sale", item: "Wheat Atta 1kg", quantity: 3 }] },

  // Alert levels and new items
  {
    tag: "threshold",
    text: "set alert for sugar to 15",
    expect: [{ type: "update_threshold", item: "Sugar 1kg", threshold: 15 }],
  },
  {
    tag: "threshold",
    text: "reorder level of boost 4",
    expect: [{ type: "update_threshold", item: "Boost 500g", threshold: 4 }],
  },
  {
    tag: "create",
    text: "new item Maggi 70g price 14 stock 20",
    expect: [{ type: "create_item", name: "Maggi 70g", quantity: 20, price: 14 }],
  },
  {
    tag: "create",
    text: "new item Kerala Halwa price 120",
    expect: [{ type: "create_item", name: "Kerala Halwa", price: 120 }],
  },
]; // prettier-ignore
