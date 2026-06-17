import { Router, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { listingId, message, quantity, unit } = req.body;
    const inquiry = await prisma.purchaseInquiry.create({
      data: { listingId, buyerId: req.user!.id, message, quantity, unit: unit || 'kg' },
      include: {
        listing: { select: { id: true, cropName: true, farmerId: true } },
      },
    });
    res.status(201).json({ inquiry });
  } catch (err) { next(err); }
});

router.get('/received', authenticate, authorize('FARMER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const inquiries = await prisma.purchaseInquiry.findMany({
      where: { listing: { farmerId: req.user!.id } },
      orderBy: { createdAt: 'desc' },
      include: {
        buyer: { select: { id: true, name: true, email: true, phone: true } },
        listing: { select: { id: true, cropName: true, quantity: true, price: true } },
      },
    });
    res.json({ inquiries });
  } catch (err) { next(err); }
});

router.get('/my', authenticate, authorize('RETAIL_BUYER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const inquiries = await prisma.purchaseInquiry.findMany({
      where: { buyerId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: {
        listing: { select: { id: true, cropName: true, images: true, price: true, farmer: { select: { id: true, name: true } } } },
      },
    });
    res.json({ inquiries });
  } catch (err) { next(err); }
});

router.put('/:id/status', authenticate, authorize('FARMER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    const inquiry = await prisma.purchaseInquiry.findUnique({
      where: { id: req.params.id },
      include: { listing: true },
    });
    if (!inquiry) throw new AppError('Inquiry not found', 404);
    if (inquiry.listing.farmerId !== req.user!.id) throw new AppError('Not authorized', 403);
    
    const updated = await prisma.purchaseInquiry.update({
      where: { id: req.params.id },
      data: { status, updatedAt: new Date() },
    });
    res.json({ inquiry: updated });
  } catch (err) { next(err); }
});

export default router;
