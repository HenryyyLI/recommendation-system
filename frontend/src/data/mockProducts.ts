import { Product } from '@/types';

const categories = [
  { name: 'Electronics', subcategories: ['Headphones', 'Speakers', 'Smartwatch', 'Camera', 'Tablet'], keywords: 'electronics gadget' },
  { name: 'Fashion', subcategories: ['Jacket', 'Sneakers', 'Dress', 'Sunglasses', 'Handbag'], keywords: 'fashion clothing' },
  { name: 'Home & Living', subcategories: ['Lamp', 'Candle', 'Throw Pillow', 'Vase', 'Wall Art'], keywords: 'home decor interior' },
  { name: 'Sports', subcategories: ['Yoga Mat', 'Running Shoes', 'Water Bottle', 'Backpack', 'Dumbbells'], keywords: 'sports fitness' },
  { name: 'Beauty', subcategories: ['Skincare Set', 'Perfume', 'Lipstick', 'Face Mask', 'Hair Oil'], keywords: 'beauty cosmetics' },
  { name: 'Books', subcategories: ['Novel', 'Cookbook', 'Self-help', 'Art Book', 'Journal'], keywords: 'book reading' },
];

const stores = [
  { id: 1, name: 'NordStream Co.', country: 'US' },
  { id: 2, name: 'EuroStyle Hub', country: 'FR' },
  { id: 3, name: 'Pacific Goods', country: 'AU' },
  { id: 4, name: 'Alpine Trading', country: 'CH' },
  { id: 5, name: 'Urban Market', country: 'UK' },
  { id: 6, name: 'Nova Retail', country: 'CA' },
];

const adjectives = ['Premium', 'Classic', 'Modern', 'Essential', 'Luxury', 'Minimal', 'Signature', 'Artisan'];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

export function generateMockProducts(page: number, pageSize: number = 10): { products: Product[]; hasMore: boolean } {
  const rand = seededRandom(page * 1000 + 42);
  const products: Product[] = [];

  for (let i = 0; i < pageSize; i++) {
    const catIdx = Math.floor(rand() * categories.length);
    const cat = categories[catIdx];
    const subIdx = Math.floor(rand() * cat.subcategories.length);
    const sub = cat.subcategories[subIdx];
    const adj = adjectives[Math.floor(rand() * adjectives.length)];
    const store = stores[Math.floor(rand() * stores.length)];
    const id = `p-${page}-${i}`;
    const price = Math.round((rand() * 150 + 10) * 100) / 100;
    const rating = Math.round((rand() * 3 + 2) * 10) / 10;
    const stock = Math.floor(rand() * 200) + 1;

    products.push({
      id,
      name: `${adj} ${sub}`,
      category: cat.name,
      subcategory: sub,
      price,
      image: `https://picsum.photos/seed/${id}/400/500`,
      storeName: store.name,
      storeCountry: store.country,
      stockQuantity: stock,
      stockCountry: store.country,
      rating,
      description: `Discover our ${adj.toLowerCase()} ${sub.toLowerCase()} — crafted with care and designed for everyday elegance. Perfect for those who appreciate quality ${cat.name.toLowerCase()}.`,
      storeId: String(store.id),
    });
  }

  return { products, hasMore: page < 10 };
}

export { categories };
