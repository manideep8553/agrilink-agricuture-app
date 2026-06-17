import { prisma } from '../index';

const MANDI_API_BASE = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';

export const fetchMandiPrices = async () => {
  try {
    const response = await fetch(
      `${MANDI_API_BASE}?api-key=${process.env.MANDI_API_KEY}&format=json&limit=1000`,
      { signal: AbortSignal.timeout(30000) }
    );
    
    if (!response.ok) throw new Error(`Mandi API returned ${response.status}`);
    
    const data: any = await response.json();
    const records = data.records || [];
    
    // Insert records in batches
    for (const record of records) {
      try {
        await prisma.cropPrice.create({
          data: {
            cropName: record.commodity || record.cropName,
            variety: record.variety || null,
            state: record.state,
            district: record.district || record.market,
            market: record.market || null,
            minPrice: parseFloat(record.min_price) || 0,
            maxPrice: parseFloat(record.max_price) || 0,
            modalPrice: parseFloat(record.modal_price) || 0,
            priceDate: new Date(),
            source: 'mandi',
          },
        });
      } catch (e) {
        // Skip duplicate or invalid records
        continue;
      }
    }
    
    console.log(`Fetched ${records.length} mandi price records`);
  } catch (error) {
    console.error('Failed to fetch mandi prices:', error);
    // Seed with sample data if API fails
    await seedSamplePrices();
  }
};

const seedSamplePrices = async () => {
  const sampleData = [
    { cropName: 'Wheat', state: 'Punjab', district: 'Ludhiana', modalPrice: 2275 },
    { cropName: 'Rice', state: 'Punjab', district: 'Amritsar', modalPrice: 3150 },
    { cropName: 'Cotton', state: 'Gujarat', district: 'Rajkot', modalPrice: 7200 },
    { cropName: 'Sugarcane', state: 'Uttar Pradesh', district: 'Lucknow', modalPrice: 3400 },
    { cropName: 'Onion', state: 'Maharashtra', district: 'Nashik', modalPrice: 1850 },
    { cropName: 'Potato', state: 'Uttar Pradesh', district: 'Agra', modalPrice: 1450 },
    { cropName: 'Tomato', state: 'Karnataka', district: 'Kolar', modalPrice: 2200 },
    { cropName: 'Mango', state: 'Andhra Pradesh', district: 'Chittoor', modalPrice: 4500 },
    { cropName: 'Banana', state: 'Tamil Nadu', district: 'Thanjavur', modalPrice: 2800 },
    { cropName: 'Groundnut', state: 'Gujarat', district: 'Junagadh', modalPrice: 5600 },
    { cropName: 'Maize', state: 'Karnataka', district: 'Belgaum', modalPrice: 2100 },
    { cropName: 'Turmeric', state: 'Telangana', district: 'Nizamabad', modalPrice: 8200 },
    { cropName: 'Chilli', state: 'Andhra Pradesh', district: 'Guntur', modalPrice: 15000 },
    { cropName: 'Coconut', state: 'Kerala', district: 'Kozhikode', modalPrice: 3500 },
    { cropName: 'Mustard', state: 'Rajasthan', district: 'Jaipur', modalPrice: 4850 },
  ];

  for (const data of sampleData) {
    await prisma.cropPrice.create({
      data: {
        ...data,
        minPrice: Math.round(data.modalPrice * 0.85),
        maxPrice: Math.round(data.modalPrice * 1.15),
        priceDate: new Date(),
        source: 'seed',
      },
    });
  }
  console.log('Seeded sample price data');
};

// Run on import
export const initPriceData = async () => {
  const count = await prisma.cropPrice.count();
  if (count === 0) {
    await seedSamplePrices();
  }
};
