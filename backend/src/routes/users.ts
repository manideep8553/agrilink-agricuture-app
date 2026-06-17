import { Router, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/profile/:id', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, name: true, avatar: true, state: true, district: true, bio: true, trustScore: true, isVerified: true, isOrganic: true, role: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const listingCount = await prisma.cropListing.count({ where: { farmerId: user.id, status: 'ACTIVE' } });
    
    res.json({ user, listingCount });
  } catch (err) { next(err); }
});

router.put('/profile', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: { ...req.body, updatedAt: new Date() },
      select: { id: true, name: true, avatar: true, phone: true, state: true, district: true, bio: true, isOrganic: true },
    });
    res.json({ user: updated });
  } catch (err) { next(err); }
});

router.post('/wishlist/:listingId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const item = await prisma.wishlistItem.upsert({
      where: { userId_listingId: { userId: req.user!.id, listingId: req.params.listingId } },
      update: {},
      create: { userId: req.user!.id, listingId: req.params.listingId },
    });
    res.json({ item });
  } catch (err) { next(err); }
});

router.delete('/wishlist/:listingId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await prisma.wishlistItem.deleteMany({
      where: { userId: req.user!.id, listingId: req.params.listingId },
    });
    res.json({ message: 'Removed from wishlist' });
  } catch (err) { next(err); }
});

router.get('/wishlist', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: req.user!.id },
      include: { listing: { include: { farmer: { select: { id: true, name: true, trustScore: true } } } } },
    });
    res.json({ wishlist: items.map((i: any) => i.listing) });
  } catch (err) { next(err); }
});

router.post('/cart/:listingId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { quantity = 1 } = req.body;
    const item = await prisma.cartItem.upsert({
      where: { userId_listingId: { userId: req.user!.id, listingId: req.params.listingId } },
      update: { quantity },
      create: { userId: req.user!.id, listingId: req.params.listingId, quantity },
    });
    res.json({ item });
  } catch (err) { next(err); }
});

router.delete('/cart/:listingId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await prisma.cartItem.deleteMany({
      where: { userId: req.user!.id, listingId: req.params.listingId },
    });
    res.json({ message: 'Removed from cart' });
  } catch (err) { next(err); }
});

router.get('/cart', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const items = await prisma.cartItem.findMany({
      where: { userId: req.user!.id },
      include: { listing: { include: { farmer: { select: { id: true, name: true } } } } },
    });
    const total = items.reduce((sum: number, item: any) => sum + item.listing.price * item.quantity, 0);
    res.json({ cart: items, total });
  } catch (err) { next(err); }
});

export default router;
