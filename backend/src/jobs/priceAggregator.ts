import { prisma } from '../index';
import { priceIntelligence } from '../services/priceIntelligence';
import { cacheDel } from '../services/redis';
import { sendPushToUser } from '../services/firebase';

const MANDI_API_BASE = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';
const API_BATCH_SIZE = 10000;

const stateNameMap: Record<string, string> = {
  'Keralam': 'Kerala',
  'Kerala': 'Kerala',
  'Tamilnadu': 'Tamil Nadu',
  'Tamil Nadu': 'Tamil Nadu',
  'Uttaranchal': 'Uttarakhand',
  'Uttarakhand': 'Uttarakhand',
  'Orissa': 'Odisha',
  'Odisha': 'Odisha',
  'Pondicherry': 'Puducherry',
  'Puducherry': 'Puducherry',
  'Chandigarh': 'Chandigarh',
  'Delhi': 'Delhi',
  'Andhra Pradesh': 'Andhra Pradesh',
  'Arunachal Pradesh': 'Arunachal Pradesh',
  'Assam': 'Assam',
  'Bihar': 'Bihar',
  'Chhattisgarh': 'Chhattisgarh',
  'Goa': 'Goa',
  'Gujarat': 'Gujarat',
  'Haryana': 'Haryana',
  'Himachal Pradesh': 'Himachal Pradesh',
  'Jammu and Kashmir': 'Jammu & Kashmir',
  'Jharkhand': 'Jharkhand',
  'Karnataka': 'Karnataka',
  'Madhya Pradesh': 'Madhya Pradesh',
  'Maharashtra': 'Maharashtra',
  'Manipur': 'Manipur',
  'Meghalaya': 'Meghalaya',
  'Mizoram': 'Mizoram',
  'Nagaland': 'Nagaland',
  'Punjab': 'Punjab',
  'Rajasthan': 'Rajasthan',
  'Sikkim': 'Sikkim',
  'Telangana': 'Telangana',
  'Tripura': 'Tripura',
  'Uttar Pradesh': 'Uttar Pradesh',
  'West Bengal': 'West Bengal',
};

function normalizeState(state: string): string {
  return stateNameMap[state] || state;
}

function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
  } else if (dateStr.includes('-')) {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function getRecordKey(record: any): string {
  const date = parseDate(record.arrival_date);
  return `${record.commodity}|${record.state}|${record.district}|${record.market}|${date.toISOString().split('T')[0]}`;
}

const CROPS = [
  'Wheat', 'Rice', 'Cotton', 'Sugarcane', 'Onion', 'Potato', 'Tomato', 'Mango',
  'Banana', 'Groundnut', 'Maize', 'Turmeric', 'Chilli', 'Coconut', 'Mustard',
  'Apple', 'Orange', 'Grapes', 'Paddy', 'Jowar', 'Bajra', 'Barley',
];

const STATES = [
  { name: 'Andhra Pradesh', districts: ['Chittoor', 'Guntur', 'Kurnool', 'Visakhapatnam', 'East Godavari'] },
  { name: 'Gujarat', districts: ['Rajkot', 'Junagadh', 'Ahmedabad', 'Surat', 'Vadodara'] },
  { name: 'Karnataka', districts: ['Kolar', 'Belgaum', 'Mysore', 'Hubli', 'Shivamogga'] },
  { name: 'Kerala', districts: ['Kozhikode', 'Thrissur', 'Palakkad', 'Alappuzha', 'Ernakulam'] },
  { name: 'Madhya Pradesh', districts: ['Indore', 'Bhopal', 'Ujjain', 'Gwalior', 'Jabalpur'] },
  { name: 'Maharashtra', districts: ['Nashik', 'Pune', 'Nagpur', 'Aurangabad', 'Solapur'] },
  { name: 'Punjab', districts: ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda'] },
  { name: 'Rajasthan', districts: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner'] },
  { name: 'Tamil Nadu', districts: ['Thanjavur', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem'] },
  { name: 'Telangana', districts: ['Nizamabad', 'Warangal', 'Karimnagar', 'Medak', 'Rangareddy'] },
  { name: 'Uttar Pradesh', districts: ['Lucknow', 'Agra', 'Kanpur', 'Varanasi', 'Allahabad'] },
  { name: 'West Bengal', districts: ['Kolkata', 'Howrah', 'Bardhaman', 'Midnapore', 'Nadia'] },
  { name: 'Bihar', districts: ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Darbhanga'] },
  { name: 'Odisha', districts: ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur'] },
  { name: 'Assam', districts: ['Guwahati', 'Dibrugarh', 'Silchar', 'Jorhat', 'Nagaon'] },
  { name: 'Haryana', districts: ['Hisar', 'Karnal', 'Ambala', 'Panipat', 'Rohtak'] },
  { name: 'Himachal Pradesh', districts: ['Shimla', 'Kangra', 'Mandi', 'Kullu', 'Solan'] },
  { name: 'Uttarakhand', districts: ['Dehradun', 'Haridwar', 'Nainital', 'Almora', 'Rishikesh'] },
];

function getSeasonalMultiplier(month: number, cropName: string): number {
  const baseMarketFactors: Record<string, number[]> = {
    'Wheat': [1.1, 1.05, 0.95, 0.9, 0.85, 0.85, 0.9, 0.95, 1.05, 1.1, 1.15, 1.15],
    'Rice': [1.05, 1.0, 0.95, 0.9, 0.85, 0.85, 0.9, 0.95, 1.0, 1.05, 1.1, 1.1],
    'Cotton': [0.95, 0.9, 0.85, 0.8, 0.85, 0.9, 1.0, 1.1, 1.15, 1.15, 1.1, 1.0],
    'Tomato': [0.8, 0.75, 0.85, 0.95, 1.1, 1.2, 1.25, 1.2, 1.1, 1.0, 0.9, 0.85],
    'Onion': [1.2, 1.15, 1.1, 1.0, 0.9, 0.85, 0.8, 0.85, 0.9, 1.0, 1.1, 1.15],
    'Mango': [0.7, 0.65, 0.75, 0.9, 1.1, 1.25, 1.3, 1.2, 1.0, 0.85, 0.75, 0.7],
    'Potato': [1.15, 1.1, 1.05, 1.0, 0.95, 0.9, 0.85, 0.85, 0.9, 0.95, 1.05, 1.1],
  };
  return baseMarketFactors[cropName]?.[month - 1] || 1.0;
}

function getBasePrice(cropName: string): number {
  const basePrices: Record<string, number> = {
    'Wheat': 2400, 'Rice': 3100, 'Cotton': 7200, 'Sugarcane': 3500,
    'Onion': 2000, 'Potato': 1500, 'Tomato': 2200, 'Mango': 5000,
    'Banana': 2800, 'Groundnut': 5600, 'Maize': 2100, 'Turmeric': 8500,
    'Chilli': 15000, 'Coconut': 3500, 'Mustard': 5000, 'Apple': 8000,
    'Orange': 4500, 'Grapes': 6000, 'Paddy': 2200, 'Jowar': 2800,
    'Bajra': 2500, 'Barley': 2600,
  };
  return basePrices[cropName] || 3000;
}

function getStatePremium(state: string): number {
  const premiums: Record<string, number> = {
    'Punjab': 1.1, 'Haryana': 1.05, 'Uttar Pradesh': 1.0,
    'Maharashtra': 0.95, 'Karnataka': 0.98, 'Gujarat': 1.02,
    'Andhra Pradesh': 0.97, 'Tamil Nadu': 1.0, 'Telangana': 0.96,
    'Madhya Pradesh': 0.93, 'Rajasthan': 0.92, 'Bihar': 0.88,
    'West Bengal': 0.95, 'Odisha': 0.9, 'Assam': 0.92,
    'Kerala': 1.08, 'Himachal Pradesh': 1.05, 'Uttarakhand': 1.03,
  };
  return premiums[state] || 1.0;
}

function generatePrice(basePrice: number, seasonalFactor: number, statePremium: number): { modal: number; min: number; max: number } {
  const noise = 0.85 + Math.random() * 0.3;
  const modal = basePrice * seasonalFactor * statePremium * noise;
  const spread = 0.1 + Math.random() * 0.1;
  return {
    modal: Math.round(modal),
    min: Math.round(modal * (1 - spread)),
    max: Math.round(modal * (1 + spread)),
  };
}

async function insertRecord(record: any): Promise<boolean> {
  try {
    const state = normalizeState(record.state);
    const recordDate = parseDate(record.arrival_date);
    const minPrice = parseFloat(record.min_price) || 0;
    const maxPrice = parseFloat(record.max_price) || 0;
    const modalPrice = parseFloat(record.modal_price) || 0;

    if (!modalPrice || !state || !record.commodity) return false;

    const existing = await prisma.cropPriceHistory.findFirst({
      where: {
        cropName: record.commodity,
        state,
        district: record.district || record.market,
        priceDate: recordDate,
      },
    });

    if (existing) return false;

    await prisma.cropPrice.create({
      data: {
        cropName: record.commodity,
        variety: record.variety || null,
        state,
        district: record.district || record.market,
        market: record.market || null,
        minPrice,
        maxPrice,
        modalPrice,
        priceDate: recordDate,
        source: 'mandi',
      },
    });

    await prisma.cropPriceHistory.create({
      data: {
        cropName: record.commodity,
        variety: record.variety || null,
        state,
        district: record.district || record.market,
        market: record.market || null,
        minPrice,
        maxPrice,
        modalPrice,
        priceDate: recordDate,
        source: 'mandi',
      },
    });

    return true;
  } catch {
    return false;
  }
}

function isApiKeyConfigured(): boolean {
  const key = process.env.MANDI_API_KEY;
  return !!key && key !== 'your-mandi-api-key';
}

async function fetchPage(offset: number, limit: number): Promise<{ records: any[]; total: number }> {
  const apiKey = process.env.MANDI_API_KEY;
  const url = `${MANDI_API_BASE}?api-key=${apiKey}&format=json&offset=${offset}&limit=${limit}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`API returned ${response.status}`);
  const data: any = await response.json();
  return { records: data.records || [], total: data.total || 0 };
}

async function fetchAllFromAPI(): Promise<number> {
  let totalInserted = 0;
  let totalRecords = 0;

  try {
    const firstPage = await fetchPage(0, 1);
    totalRecords = firstPage.total;
  } catch {
  }
  console.log(`Mandi API has ${totalRecords} total records`);

  const maxWindow = 10000;
  const batchSize = Math.min(API_BATCH_SIZE, maxWindow);

  const { records } = await fetchPage(0, batchSize);
  let batchInserted = 0;

  for (const record of records) {
    const ok = await insertRecord(record);
    if (ok) batchInserted++;
  }

  totalInserted += batchInserted;
  console.log(`  Fetched ${records.length} records, ${batchInserted} new`);

  return totalInserted;
}

async function fetchLatestFromAPI(): Promise<number> {
  let totalInserted = 0;
  const { records } = await fetchPage(0, API_BATCH_SIZE);

  for (const record of records) {
    const ok = await insertRecord(record);
    if (ok) totalInserted++;
  }

  console.log(`Fetched latest ${records.length} records, ${totalInserted} new`);
  return totalInserted;
}

async function generateRealisticData(): Promise<number> {
  const now = new Date();
  let inserted = 0;

  for (const state of STATES) {
    for (const district of state.districts) {
      const numCrops = 3 + Math.floor(Math.random() * 5);
      const selectedCrops = CROPS.sort(() => Math.random() - 0.5).slice(0, numCrops);

      for (const cropName of selectedCrops) {
        const basePrice = getBasePrice(cropName);
        const statePremium = getStatePremium(state.name);
        const baseModal = basePrice * statePremium;

        for (let dayOffset = 0; dayOffset < 90; dayOffset += Math.max(1, Math.floor(Math.random() * 7))) {
          const priceDate = new Date(now);
          priceDate.setDate(priceDate.getDate() - dayOffset);
          const dataMonth = priceDate.getMonth() + 1;
          const seasonalFactor = getSeasonalMultiplier(dataMonth, cropName);

          const dayNoise = 0.9 + Math.random() * 0.2;
          const weeklyTrend = 1 + (Math.sin(dayOffset * 0.1) * 0.05);
          const modal = Math.round(baseModal * seasonalFactor * dayNoise * weeklyTrend);
          const spread = 0.08 + Math.random() * 0.08;
          const min = Math.round(modal * (1 - spread));
          const max = Math.round(modal * (1 + spread));

          priceDate.setHours(6 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60));

          try {
            await prisma.cropPriceHistory.create({
              data: {
                cropName, state: state.name, district,
                market: `${district} Mandi`,
                minPrice: min, maxPrice: max, modalPrice: modal,
                priceDate, source: 'generated',
              },
            });
            inserted++;
          } catch {
            continue;
          }
        }
      }
    }
  }
  return inserted;
}

export async function fetchMandiPrices(fullSync = false): Promise<{ inserted: number; source: string }> {
  let inserted = 0;
  let source = '';

  if (isApiKeyConfigured()) {
    try {
      if (fullSync) {
        inserted = await fetchAllFromAPI();
      } else {
        inserted = await fetchLatestFromAPI();
      }
      source = 'mandi';
    } catch (apiError) {
      console.warn('Mandi API failed:', (apiError as Error).message);
      if (fullSync) {
        console.log('Falling back to generated data');
        inserted = await generateRealisticData();
        source = 'generated';
      }
    }
  } else {
    if (fullSync) {
      console.log('No API key configured, generating realistic data');
      inserted = await generateRealisticData();
      source = 'generated';
    }
  }

  if (inserted > 0 || fullSync) {
    try {
      await cacheDel('analytics:*');
      await cacheDel('prices:*');
      await cacheDel('heatmap:*');
    } catch {
    }

    try {
      const crops = await prisma.cropPriceHistory.findMany({
        distinct: ['cropName'], select: { cropName: true },
        where: { priceDate: { gte: new Date(Date.now() - 86400000) } },
      });
      for (const { cropName } of crops) {
        try {
          await priceIntelligence.computeSeasonality(cropName);
        } catch {
        }
      }
    } catch {
    }

    const highPriceAlerts = await checkPriceAlerts();
    if (highPriceAlerts > 0) {
      console.log(`Triggered ${highPriceAlerts} price alerts`);
    }
  }

  return { inserted, source };
}

async function checkPriceAlerts(): Promise<number> {
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);

  const alerts = await prisma.priceAlert.findMany({
    where: { isActive: true },
    include: { user: { select: { id: true, fcmToken: true } } },
  });

  let triggered = 0;
  for (const alert of alerts) {
    try {
      const latestPrice = await prisma.cropPriceHistory.findFirst({
        where: {
          cropName: alert.cropName,
          state: alert.state || undefined,
          district: alert.district || undefined,
          priceDate: { gte: yesterday },
        },
        orderBy: { priceDate: 'desc' },
      });

      if (!latestPrice) continue;

      const shouldTrigger = alert.targetPrice
        ? (latestPrice.modalPrice >= alert.targetPrice)
        : false;

      if (shouldTrigger) {
        await prisma.notification.create({
          data: {
            userId: alert.userId,
            title: `Price Alert: ${alert.cropName}`,
            body: `${alert.cropName} is now ₹${latestPrice.modalPrice}/quintal at ${latestPrice.district}, ${latestPrice.state}`,
            type: 'price_alert',
            data: {
              cropName: alert.cropName,
              price: String(latestPrice.modalPrice),
              state: latestPrice.state,
              district: latestPrice.district,
            },
          },
        });

        if (alert.user.fcmToken) {
          await sendPushToUser(
            alert.userId,
            `Price Alert: ${alert.cropName}`,
            `${alert.cropName} is now ₹${latestPrice.modalPrice}/quintal at ${latestPrice.district}, ${latestPrice.state}`
          );
        }

        await prisma.priceAlert.update({
          where: { id: alert.id },
          data: { isActive: false },
        });

        triggered++;
      }
    } catch {
      continue;
    }
  }
  return triggered;
}

export async function initPriceData(): Promise<void> {
  const count = await prisma.cropPriceHistory.count();
  if (count > 0) return;

  console.log('No price data found. Generating initial dataset...');
  const result = await fetchMandiPrices(true);
  console.log(`Initial data complete: ${result.inserted} records (${result.source})`);
}
