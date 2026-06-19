import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { getCachedOrFetch, cacheDel } from '../services/redis';
import { priceIntelligence } from '../services/priceIntelligence';

const router = Router();

const PRICE_TTL = 120;

/**
 * @swagger
 * /prices:
 *   get:
 *     tags: [Prices]
 *     summary: Get crop prices with filters
 *     parameters:
 *       - in: query
 *         name: cropName
 *         schema: { type: string }
 *       - in: query
 *         name: state
 *         schema: { type: string }
 *       - in: query
 *         name: district
 *         schema: { type: string }
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 7 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 100 }
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cropName, state, district, days = 7, limit = 100 } = req.query;

    const cacheKey = `prices:list:${cropName || ''}:${state || ''}:${district || ''}:${days}:${limit}`;
    const data = await getCachedOrFetch(cacheKey, async () => {
      const where: any = {};
      if (cropName) where.cropName = cropName as string;
      if (state) where.state = state as string;
      if (district) where.district = district as string;

      const since = new Date();
      since.setDate(since.getDate() - Number(days));
      where.priceDate = { gte: since };

      const prices = await prisma.cropPriceHistory.findMany({
        where,
        orderBy: { priceDate: 'asc' },
        take: Number(limit),
      });

      const latest = prices.length > 0 ? prices[prices.length - 1] : null;
      const avgPrice = prices.length > 0
        ? prices.reduce((s, p) => s + p.modalPrice, 0) / prices.length
        : 0;
      const minPrice = prices.length > 0
        ? Math.min(...prices.map(p => p.modalPrice))
        : 0;
      const maxPrice = prices.length > 0
        ? Math.max(...prices.map(p => p.modalPrice))
        : 0;

      const firstPrice = prices.length > 1 ? prices[0].modalPrice : 0;
      const lastPrice = prices.length > 1 ? prices[prices.length - 1].modalPrice : 0;
      const priceChange = firstPrice > 0 ? lastPrice - firstPrice : 0;
      const percentChange = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;

      return {
        prices,
        stats: {
          avg: Math.round(avgPrice * 100) / 100,
          min: minPrice,
          max: maxPrice,
          latest: latest?.modalPrice || 0,
          priceChange: Math.round(priceChange * 100) / 100,
          percentChange: Math.round(percentChange * 100) / 100,
        },
        trend: prices.map(p => ({ date: p.priceDate, price: p.modalPrice })),
      };
    }, PRICE_TTL);

    res.json(data);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /prices/heatmap:
 *   get:
 *     tags: [Prices]
 *     summary: Get price data for India heatmap
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
    const cacheKey = `prices:heatmap:${state || 'all'}:${cropName || 'all'}`;
    const heatmapData = await getCachedOrFetch(cacheKey, () =>
      priceIntelligence.computeHeatmap(state as string, cropName as string),
    PRICE_TTL);

    res.json({ heatmapData });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /prices/crops:
 *   get:
 *     tags: [Prices]
 *     summary: Get list of available crops
 */
router.get('/crops', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = 'prices:crops';
    const crops = await getCachedOrFetch(cacheKey, async () => {
      const result = await prisma.cropPriceHistory.findMany({
        select: { cropName: true },
        distinct: ['cropName'],
        orderBy: { cropName: 'asc' },
      });
      return { crops: result.map(c => c.cropName) };
    }, 600);

    res.json(crops);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /prices/states:
 *   get:
 *     tags: [Prices]
 *     summary: Get list of states with price data
 */
router.get('/states', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = 'prices:states';
    const states = await getCachedOrFetch(cacheKey, async () => {
      const result = await prisma.cropPriceHistory.findMany({
        select: { state: true },
        distinct: ['state'],
        orderBy: { state: 'asc' },
      });
      return { states: result.map(s => s.state) };
    }, 600);

    res.json(states);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /prices/latest:
 *   get:
 *     tags: [Prices]
 *     summary: Get latest prices for all crops
 *     parameters:
 *       - in: query
 *         name: state
 *         schema: { type: string }
 */
router.get('/latest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { state } = req.query;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const where: any = { priceDate: { gte: sevenDaysAgo } };
    if (state) where.state = state as string;

    const cacheKey = `prices:latest:${state || 'all'}`;
    const data = await getCachedOrFetch(cacheKey, async () => {
      const prices = await prisma.cropPriceHistory.findMany({
        where,
        orderBy: { priceDate: 'desc' },
      });

      const byCrop = new Map<string, { price: number; state: string; district: string; date: Date }>();
      for (const p of prices) {
        if (!byCrop.has(p.cropName) || p.priceDate > byCrop.get(p.cropName)!.date) {
          byCrop.set(p.cropName, { price: p.modalPrice, state: p.state, district: p.district, date: p.priceDate });
        }
      }

      return {
        latestPrices: Array.from(byCrop.entries()).map(([crop, data]) => ({
          cropName: crop, ...data
        })),
      };
    }, PRICE_TTL);

    res.json(data);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /prices/history:
 *   get:
 *     tags: [Prices]
 *     summary: Get historical price data for charting
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
 *         name: months
 *         schema: { type: integer, default: 6 }
 */
router.get('/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cropName, state, district, months = 6 } = req.query;
    if (!cropName) return res.status(400).json({ error: 'cropName is required' });

    const since = new Date();
    since.setMonth(since.getMonth() - Number(months));

    const where: any = { cropName, priceDate: { gte: since } };
    if (state) where.state = state as string;
    if (district) where.district = district as string;

    const cacheKey = `prices:history:${cropName}:${state || ''}:${district || ''}:${months}`;
    const data = await getCachedOrFetch(cacheKey, async () => {
      const prices = await prisma.cropPriceHistory.findMany({
        where,
        orderBy: { priceDate: 'asc' },
        select: { modalPrice: true, minPrice: true, maxPrice: true, priceDate: true, state: true, district: true },
      });

      const dailyAvg = new Map<string, { avg: number; min: number; max: number; count: number }>();
      for (const p of prices) {
        const key = p.priceDate.toISOString().split('T')[0];
        if (!dailyAvg.has(key)) dailyAvg.set(key, { avg: 0, min: Infinity, max: 0, count: 0 });
        const d = dailyAvg.get(key)!;
        d.avg += p.modalPrice;
        d.min = Math.min(d.min, p.modalPrice);
        d.max = Math.max(d.max, p.modalPrice);
        d.count++;
      }

      const history = Array.from(dailyAvg.entries()).map(([date, data]) => ({
        date,
        avgPrice: Math.round((data.avg / data.count) * 100) / 100,
        minPrice: data.min === Infinity ? 0 : data.min,
        maxPrice: data.max,
      }));

      return { history };
    }, PRICE_TTL);

    res.json(data);
  } catch (err) { next(err); }
});

export default router;
