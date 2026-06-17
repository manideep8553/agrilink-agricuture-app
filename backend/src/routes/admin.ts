import { Router, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// All admin routes require ADMIN role
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
    const listing = await prisma.cropListing.update({
      where: { id: req.params.id },
      data: { status, updatedAt: new Date() },
    });
    res.json({ listing });
  } catch (err) { next(err); }
});

router.get('/farmers', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const farmers = await prisma.user.findMany({
      where: { role: 'FARMER' },
      select: { id: true, name: true, email: true, phone: true, state: true, isVerified: true, trustScore: true, createdAt: true, _count: { select: { listings: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ farmers });
  } catch (err) { next(err); }
});

router.put('/farmers/:id/verify', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isVerified: true, updatedAt: new Date() },
    });
    res.json({ user: { id: user.id, name: user.name, isVerified: user.isVerified } });
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

export default router;
