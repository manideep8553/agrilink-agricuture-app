import { Router, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const alerts = await prisma.priceAlert.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ alerts });
  } catch (err) { next(err); }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { cropName, state, district, targetPrice } = req.body;
    const alert = await prisma.priceAlert.create({
      data: { userId: req.user!.id, cropName, state, district, targetPrice },
    });
    res.status(201).json({ alert });
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const alert = await prisma.priceAlert.findUnique({ where: { id: req.params.id } });
    if (!alert || alert.userId !== req.user!.id) throw new AppError('Not found', 404);
    await prisma.priceAlert.delete({ where: { id: req.params.id } });
    res.json({ message: 'Alert deleted' });
  } catch (err) { next(err); }
});

export default router;
