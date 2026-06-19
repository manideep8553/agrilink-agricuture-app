import { Router, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { priceIntelligence } from '../services/priceIntelligence';
import { getCachedOrFetch } from '../services/redis';

const router = Router();

const REC_TTL = 300;

router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    const cacheKey = `recs:${userId}`;
    const result = await getCachedOrFetch(cacheKey, async () => {
      const wishlistItems = await prisma.wishlistItem.findMany({
        where: { userId },
        include: { listing: true },
      });

      const cartItems = await prisma.cartItem.findMany({
        where: { userId },
        include: { listing: true },
      });

      const interestedCrops = [...wishlistItems, ...cartItems].map(i => i.listing.cropName);
      const interestedStates = [...wishlistItems, ...cartItems].map(i => i.listing.state);

      const similarListings = await prisma.cropListing.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            ...(interestedCrops.length > 0 ? [{ cropName: { in: interestedCrops } }] : []),
            ...(interestedStates.length > 0 ? [{ state: { in: interestedStates } }] : []),
            ...(user?.district ? [{ district: user.district }] : []),
          ],
          farmerId: { not: userId },
        },
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          farmer: { select: { id: true, name: true, trustScore: true, isVerified: true, state: true } },
        },
      });

      let bestCrops: any[] = [];
      try {
        bestCrops = await priceIntelligence.getBestCrops(user?.state || undefined, user?.district || undefined, 5);
      } catch {
      }

      let marketInsights: any[] = [];
      if (similarListings.length > 0) {
        const topCrops = [...new Set(similarListings.slice(0, 5).map(l => l.cropName))];
        marketInsights = await Promise.all(
          topCrops.map(async (cropName) => {
            try {
              const [trend, forecast] = await Promise.all([
                priceIntelligence.computeTrend(cropName, user?.state || undefined, user?.district || undefined, 30),
                priceIntelligence.forecastPrice(cropName, user?.state || undefined, user?.district || undefined, 15),
              ]);
              return { cropName, trend: trend.trendDirection, percentChange: trend.percentChange, avgPrice: trend.avgPrice, forecast };
            } catch {
              return null;
            }
          })
        );
        marketInsights = marketInsights.filter(Boolean);
      }

      let recommendations = similarListings;
      if (recommendations.length === 0) {
        recommendations = await prisma.cropListing.findMany({
          where: { status: 'ACTIVE', farmerId: { not: userId } },
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            farmer: { select: { id: true, name: true, trustScore: true, isVerified: true, state: true } },
          },
        });
      }

      return { recommendations, bestCrops, marketInsights };
    }, REC_TTL);

    res.json(result);
  } catch (err) { next(err); }
});

export default router;
