import { Router, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logAudit } from '../services/audit';
import { sendPushToUser } from '../services/firebase';
import { cacheDel } from '../services/redis';
import { fetchMandiPrices } from '../jobs/priceAggregator';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/listings', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where: any = {};
    if (status) where.status = status;

    const [listings, total] = await Promise.all([
      prisma.cropListing.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: { farmer: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.cropListing.count({ where }),
    ]);
    res.json({ listings, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) { next(err); }
});

router.put('/listings/:id/status', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    const listing = await prisma.cropListing.findUnique({ where: { id: req.params.id } });
    if (!listing) throw new AppError('Listing not found', 404);

    const oldStatus = listing.status;
    const updated = await prisma.cropListing.update({
      where: { id: req.params.id },
      data: { status, updatedAt: new Date() },
    });

    await logAudit('UPDATE_LISTING_STATUS', 'CropListing', req.params.id, req.user!.id, { status: oldStatus }, { status });

    if (status === 'ACTIVE') {
      const farmer = await prisma.user.findUnique({ where: { id: listing.farmerId } });
      if (farmer?.fcmToken) {
        await sendPushToUser(farmer.id, 'Listing Approved', `Your ${listing.cropName} listing has been approved`);
      }
      await prisma.notification.create({
        data: {
          userId: listing.farmerId,
          title: 'Listing Approved',
          body: `Your ${listing.cropName} listing has been approved and is now live`,
          type: 'listing_update',
          data: { listingId: listing.id, status },
        },
      });
    }

    await cacheDel(`listings:*`);
    res.json({ listing: updated });
  } catch (err) { next(err); }
});

router.get('/farmers', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const farmers = await prisma.user.findMany({
      where: { role: 'FARMER' },
      select: {
        id: true, name: true, email: true, phone: true, state: true, district: true,
        isVerified: true, trustScore: true, isOrganic: true, createdAt: true,
        _count: { select: { listings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ farmers });
  } catch (err) { next(err); }
});

router.put('/farmers/:id/verify', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const farmer = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!farmer) throw new AppError('Farmer not found', 404);

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isVerified: !farmer.isVerified, updatedAt: new Date() },
    });

    await logAudit(
      farmer.isVerified ? 'UNVERIFY_FARMER' : 'VERIFY_FARMER',
      'User', req.params.id, req.user!.id,
      { isVerified: farmer.isVerified }, { isVerified: updated.isVerified }
    );

    const status = updated.isVerified ? 'verified' : 'unverified';
    await prisma.notification.create({
      data: {
        userId: req.params.id,
        title: `Account ${status}`,
        body: `Your account has been ${status} by an administrator`,
        type: 'account_update',
      },
    });

    if (farmer.fcmToken) {
      await sendPushToUser(farmer.id, `Account ${status}`, `Your account has been ${status} by an administrator`);
    }

    res.json({ user: { id: updated.id, name: updated.name, isVerified: updated.isVerified } });
  } catch (err) { next(err); }
});

router.get('/disputes', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const inquiries = await prisma.purchaseInquiry.findMany({
      where: { status: 'PENDING' },
      include: {
        listing: { select: { cropName: true, farmer: { select: { id: true, name: true } } } },
        buyer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ disputes: inquiries });
  } catch (err) { next(err); }
});

router.post('/refresh-prices', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { fullSync } = req.query;
    res.json({ message: 'Price refresh started', status: 'running' });

    const result = await fetchMandiPrices(fullSync === 'true');
    console.log(`Admin-triggered price refresh: ${result.inserted} records (${result.source})`);
  } catch (err) { next(err); }
});

router.get('/stats', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [users, farmers, listings, inquiries, prices] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'FARMER' } }),
      prisma.cropListing.count(),
      prisma.purchaseInquiry.count(),
      prisma.cropPriceHistory.count(),
    ]);

    await logAudit('VIEW_ADMIN_STATS', 'Admin', undefined, req.user!.id);

    res.json({
      stats: { totalUsers: users, totalFarmers: farmers, totalListings: listings, totalInquiries: inquiries, totalPriceRecords: prices },
    });
  } catch (err) { next(err); }
});

export default router;
