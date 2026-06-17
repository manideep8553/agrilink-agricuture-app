import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../index';

const router = Router();

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
 *     responses:
 *       200: { description: Price data }
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cropName, state, district, days = 7 } = req.query;
    
    const where: any = {};
    if (cropName) where.cropName = cropName as string;
    if (state) where.state = state as string;
    if (district) where.district = district as string;
    
    const since = new Date();
    since.setDate(since.getDate() - Number(days));
    where.priceDate = { gte: since };
    
    const prices = await prisma.cropPrice.findMany({
      where,
      orderBy: { priceDate: 'asc' },
    });
    
    // Compute aggregates
    const latest = prices.length > 0 ? prices[prices.length - 1] : null;
    const avgPrice = prices.length > 0 ? prices.reduce((s: number, p: any) => s + p.modalPrice, 0) / prices.length : 0;
    const minPrice = prices.length > 0 ? Math.min(...prices.map((p: any) => p.modalPrice)) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices.map((p: any) => p.modalPrice)) : 0;
    
    res.json({
      prices,
      stats: { avg: Math.round(avgPrice * 100) / 100, min: minPrice, max: maxPrice, latest: latest?.modalPrice },
      trend: prices.map((p: any) => ({ date: p.priceDate, price: p.modalPrice })),
    });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /prices/heatmap:
 *   get:
 *     tags: [Prices]
 *     summary: Get price data for India heatmap
 */
router.get('/heatmap', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const prices = await prisma.cropPrice.findMany({
      where: { priceDate: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      orderBy: { priceDate: 'desc' },
    });
    
    // Group by state and compute latest modal price per state
    const stateMap = new Map<string, { avgPrice: number; count: number; districts: Map<string, number> }>();
    
    for (const p of prices) {
      if (!stateMap.has(p.state)) {
        stateMap.set(p.state, { avgPrice: 0, count: 0, districts: new Map() });
      }
      const state = stateMap.get(p.state)!;
      state.avgPrice += p.modalPrice;
      state.count++;
      state.districts.set(p.district, p.modalPrice);
    }
    
    const heatmapData = Array.from(stateMap.entries()).map(([state, data]) => ({
      state,
      avgPrice: data.count > 0 ? Math.round(data.avgPrice / data.count * 100) / 100 : 0,
      latestPrice: data.count > 0 ? Math.round(data.avgPrice / data.count * 100) / 100 : 0,
      districts: Array.from(data.districts.entries()).map(([district, price]) => ({ district, price })),
    }));
    
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
    const crops = await prisma.cropPrice.findMany({
      select: { cropName: true },
      distinct: ['cropName'],
      orderBy: { cropName: 'asc' },
    });
    res.json({ crops: crops.map((c: any) => c.cropName) });
  } catch (err) { next(err); }
});

export default router;
