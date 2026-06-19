import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { priceIntelligence } from '../services/priceIntelligence';
import { getCachedOrFetch, cacheDel } from '../services/redis';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const ANALYTICS_TTL = 180;

/**
 * @swagger
 * /analytics/trends:
 *   get:
 *     tags: [Analytics]
 *     summary: Get price trends for a crop
 *     parameters:
 *       - in: query
 *         name: cropName
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: state
 *         schema: { type: string }
 *       - in: query
 *         name: district
 *         schema: { type: string }
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 30 }
 */
router.get('/trends', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cropName, state, district, days = 30 } = req.query;
    if (!cropName) return res.status(400).json({ error: 'cropName is required' });

    const cacheKey = `analytics:trends:${cropName}:${state || ''}:${district || ''}:${days}`;
    const data = await getCachedOrFetch(cacheKey, () =>
      priceIntelligence.computeTrend(cropName as string, state as string, district as string, Number(days)),
    ANALYTICS_TTL);

    res.json(data);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /analytics/seasonality:
 *   get:
 *     tags: [Analytics]
 *     summary: Get seasonal price patterns for a crop
 *     parameters:
 *       - in: query
 *         name: cropName
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: state
 *         schema: { type: string }
 *       - in: query
 *         name: district
 *         schema: { type: string }
 */
router.get('/seasonality', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cropName, state, district } = req.query;
    if (!cropName) return res.status(400).json({ error: 'cropName is required' });

    const cacheKey = `analytics:seasonality:${cropName}:${state || ''}:${district || ''}`;
    const data = await getCachedOrFetch(cacheKey, () =>
      priceIntelligence.computeSeasonality(cropName as string, state as string, district as string),
    ANALYTICS_TTL);

    res.json({ insights: data });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /analytics/forecast:
 *   get:
 *     tags: [Analytics]
 *     summary: Get price forecast for a crop
 *     parameters:
 *       - in: query
 *         name: cropName
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: state
 *         schema: { type: string }
 *       - in: query
 *         name: district
 *         schema: { type: string }
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 30 }
 */
router.get('/forecast', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cropName, state, district, days = 30 } = req.query;
    if (!cropName) return res.status(400).json({ error: 'cropName is required' });

    const cacheKey = `analytics:forecast:${cropName}:${state || ''}:${district || ''}:${days}`;
    const data = await getCachedOrFetch(cacheKey, () =>
      priceIntelligence.forecastPrice(cropName as string, state as string, district as string, Number(days)),
    ANALYTICS_TTL);

    res.json(data);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /analytics/best-crops:
 *   get:
 *     tags: [Analytics]
 *     summary: Get best performing crops by region
 *     parameters:
 *       - in: query
 *         name: state
 *         schema: { type: string }
 *       - in: query
 *         name: district
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 5 }
 */
router.get('/best-crops', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { state, district, limit = 5 } = req.query;
    const cacheKey = `analytics:best-crops:${state || ''}:${district || ''}:${limit}`;
    const data = await getCachedOrFetch(cacheKey, () =>
      priceIntelligence.getBestCrops(state as string, district as string, Number(limit)),
    ANALYTICS_TTL);

    res.json({ recommendations: data });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /analytics/heatmap:
 *   get:
 *     tags: [Analytics]
 *     summary: Get district/state level price heatmap
 *     parameters:
 *       - in: query
 *         name: state
 *         schema: { type: string }
 *       - in: query
 *         name: cropName
 *         schema: { type: string }
 */
router.get('/heatmap', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { state, cropName } = req.query;
    const cacheKey = `analytics:heatmap:${state || 'all'}:${cropName || 'all'}`;
    const data = await getCachedOrFetch(cacheKey, () =>
      priceIntelligence.computeHeatmap(state as string, cropName as string),
    ANALYTICS_TTL);

    res.json({ heatmap: data });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /analytics/market-overview:
 *   get:
 *     tags: [Analytics]
 *     summary: Get overall market statistics
 */
router.get('/market-overview', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = 'analytics:market-overview';
    const data = await getCachedOrFetch(cacheKey, () => priceIntelligence.getMarketOverview(), ANALYTICS_TTL);
    res.json(data);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /analytics/profit-estimate:
 *   get:
 *     tags: [Analytics]
 *     summary: Estimate profit for a crop in a region
 *     parameters:
 *       - in: query
 *         name: cropName
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: state
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: district
 *         schema: { type: string }
 *       - in: query
 *         name: landSize
 *         schema: { type: number, description: "Land size in acres" }
 */
router.get('/profit-estimate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cropName, state, district, landSize = 1 } = req.query;
    if (!cropName || !state) return res.status(400).json({ error: 'cropName and state are required' });

    const productionCosts: Record<string, number> = {
      'Wheat': 15000, 'Rice': 18000, 'Cotton': 35000, 'Sugarcane': 40000,
      'Onion': 25000, 'Potato': 22000, 'Tomato': 28000, 'Mango': 20000,
      'Banana': 30000, 'Groundnut': 20000, 'Maize': 14000, 'Turmeric': 45000,
      'Chilli': 35000, 'Coconut': 15000, 'Mustard': 12000, 'Apple': 50000,
      'Orange': 25000, 'Grapes': 40000, 'Paddy': 16000, 'Jowar': 10000,
      'Bajra': 9000, 'Barley': 11000,
    };

    const yieldsPerAcre: Record<string, number> = {
      'Wheat': 25, 'Rice': 30, 'Cotton': 8, 'Sugarcane': 350,
      'Onion': 100, 'Potato': 120, 'Tomato': 150, 'Mango': 50,
      'Banana': 100, 'Groundnut': 15, 'Maize': 25, 'Turmeric': 15,
      'Chilli': 10, 'Coconut': 80, 'Mustard': 12, 'Apple': 40,
      'Orange': 60, 'Grapes': 70, 'Paddy': 28, 'Jowar': 15,
      'Bajra': 12, 'Barley': 18,
    };

    const costPerAcre = productionCosts[cropName as string] || 20000;
    const yieldPerAcre = yieldsPerAcre[cropName as string] || 20;
    const acres = Number(landSize);

    const trend = await priceIntelligence.computeTrend(cropName as string, state as string, district as string, 90);
    const basePrices: Record<string, number> = {
      'Wheat': 2400, 'Rice': 3100, 'Cotton': 7200, 'Sugarcane': 3500,
      'Onion': 2000, 'Potato': 1500, 'Tomato': 2200, 'Mango': 5000,
      'Banana': 2800, 'Groundnut': 5600, 'Maize': 2100, 'Turmeric': 8500,
      'Chilli': 15000, 'Coconut': 3500, 'Mustard': 5000, 'Apple': 8000,
      'Orange': 4500, 'Grapes': 6000, 'Paddy': 2200, 'Jowar': 2800, 'Bajra': 2500, 'Barley': 2600,
    };
    const avgPrice = trend.avgPrice || basePrices[cropName as string] || 3000;

    const totalCost = costPerAcre * acres;
    const totalYield = yieldPerAcre * acres;
    const totalRevenue = totalYield * avgPrice;
    const netProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const breakEvenPrice = totalYield > 0 ? (totalCost / totalYield) * 100 : 0;

    res.json({
      cropName, state, district: district || 'All districts',
      landSize: acres, totalCost, totalYield: `${totalYield} quintals`,
      avgMarketPrice: avgPrice,
      estimatedRevenue: totalRevenue,
      netProfit,
      profitMargin: Math.round(profitMargin * 100) / 100,
      breakEvenPrice: Math.round(breakEvenPrice * 100) / 100,
      recommendation: netProfit > 0
        ? `Profitable crop for ${state} with estimated ₹${Math.round(netProfit / acres)}/acre profit`
        : `Not profitable at current market prices in ${state}`,
    });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /analytics/compare:
 *   get:
 *     tags: [Analytics]
 *     summary: Compare crop prices across states
 *     parameters:
 *       - in: query
 *         name: cropName
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: states
 *         schema: { type: string, description: "Comma-separated state names" }
 */
router.get('/compare', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cropName, states } = req.query;
    if (!cropName) return res.status(400).json({ error: 'cropName is required' });

    const stateList = states ? (states as string).split(',').map((s: string) => s.trim()) : [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const where: any = { cropName, priceDate: { gte: thirtyDaysAgo } };
    if (stateList.length > 0) where.state = { in: stateList };

    const prices = await prisma.cropPriceHistory.findMany({ where });

    const byState = new Map<string, number[]>();
    for (const p of prices) {
      if (!byState.has(p.state)) byState.set(p.state, []);
      byState.get(p.state)!.push(p.modalPrice);
    }

    const comparison = Array.from(byState.entries()).map(([state, vals]) => ({
      state,
      avgPrice: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100,
      minPrice: Math.min(...vals),
      maxPrice: Math.max(...vals),
      sampleCount: vals.length,
    }));

    comparison.sort((a, b) => b.avgPrice - a.avgPrice);

    res.json({ cropName, comparison });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /analytics/top-markets:
 *   get:
 *     tags: [Analytics]
 *     summary: Get top N markets for a crop
 *     parameters:
 *       - in: query
 *         name: cropName
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 */
router.get('/top-markets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cropName, limit = 10 } = req.query;
    if (!cropName) return res.status(400).json({ error: 'cropName is required' });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const prices = await prisma.cropPriceHistory.findMany({
      where: { cropName: cropName as string, priceDate: { gte: sevenDaysAgo } },
    });

    const byMarket = new Map<string, { prices: number[]; state: string; district: string }>();
    for (const p of prices) {
      const key = `${p.district}, ${p.state}`;
      if (!byMarket.has(key)) byMarket.set(key, { prices: [], state: p.state, district: p.district });
      byMarket.get(key)!.prices.push(p.modalPrice);
    }

    const markets = Array.from(byMarket.entries()).map(([name, data]) => ({
      market: name,
      state: data.state,
      district: data.district,
      avgPrice: Math.round((data.prices.reduce((a, b) => a + b, 0) / data.prices.length) * 100) / 100,
      sampleCount: data.prices.length,
    }));

    markets.sort((a, b) => b.avgPrice - a.avgPrice);
    res.json({ cropName, markets: markets.slice(0, Number(limit)) });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /analytics/dashboard:
 *   get:
 *     tags: [Analytics]
 *     summary: Get complete analytics dashboard data
 *     security: [{ bearerAuth: [] }]
 */
router.get('/dashboard', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

    const [marketOverview, bestCrops, seasonality] = await Promise.all([
      priceIntelligence.getMarketOverview(),
      priceIntelligence.getBestCrops(user?.state || undefined, user?.district || undefined, 5),
      user?.state
        ? priceIntelligence.computeSeasonality('Wheat', user.state)
        : Promise.resolve([]),
    ]);

    const userListings = await prisma.cropListing.findMany({
      where: { farmerId: req.user!.id, status: 'ACTIVE' },
      select: { id: true, cropName: true, price: true, quantity: true, state: true, district: true, createdAt: true },
    });

    const listingInsights = await Promise.all(
      userListings.slice(0, 5).map(async (listing) => {
        try {
          const trend = await priceIntelligence.computeTrend(listing.cropName, listing.state, listing.district, 30);
          const currentTrend: 'up' | 'down' | 'stable' = trend.avgPrice > 0 && listing.price
            ? (listing.price > trend.avgPrice * 1.1 ? 'up' : listing.price < trend.avgPrice * 0.9 ? 'down' : 'stable')
            : 'stable';
          return { ...listing, marketAvg: trend.avgPrice, trend: currentTrend, percentChange: trend.percentChange };
        } catch {
          return { ...listing, marketAvg: 0, trend: 'stable', percentChange: 0 };
        }
      })
    );

    res.json({ marketOverview, bestCrops, seasonality, listingInsights });
  } catch (err) { next(err); }
});

export default router;
