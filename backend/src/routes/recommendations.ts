import { Router, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    // Get user's browsing history from wishlist and cart
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
    
    // Find similar listings
    const recommendations = await prisma.cropListing.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { cropName: { in: interestedCrops } },
          { state: { in: interestedStates } },
          { district: user?.district || '' },
        ],
        farmerId: { not: userId },
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        farmer: { select: { id: true, name: true, trustScore: true, isVerified: true, state: true } },
      },
    });
    
    // If no recommendations based on history, show latest listings
    if (recommendations.length === 0) {
      const latest = await prisma.cropListing.findMany({
        where: { status: 'ACTIVE', farmerId: { not: userId } },
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          farmer: { select: { id: true, name: true, trustScore: true, isVerified: true, state: true } },
        },
      });
      return res.json({ recommendations: latest });
    }
    
    res.json({ recommendations });
  } catch (err) { next(err); }
});

export default router;
