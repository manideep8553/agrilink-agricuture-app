import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { uploadMultipleToCloudinary } from '../services/cloudinary';
import { logAudit } from '../services/audit';
import { cacheDel } from '../services/redis';

const router = Router();

const createListingSchema = z.object({
  body: z.object({
    cropName: z.string().min(1),
    variety: z.string().optional(),
    quantity: z.number().positive(),
    unit: z.string().default('kg'),
    price: z.number().positive(),
    state: z.string().min(1),
    district: z.string().min(1),
    images: z.array(z.string()).optional(),
    harvestDate: z.string().optional(),
    organicCertified: z.boolean().optional(),
    description: z.string().optional(),
  }),
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, cropName, state, district, minPrice, maxPrice, organicCertified, sortBy, sortOrder } = req.query;

    const where: any = { status: 'ACTIVE' };
    if (cropName) where.cropName = { contains: cropName as string };
    if (state) where.state = state as string;
    if (district) where.district = district as string;
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice as string);
      if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
    }
    if (organicCertified === 'true') where.organicCertified = true;

    const orderBy: any = {};
    if (sortBy === 'price') orderBy.price = sortOrder === 'desc' ? 'desc' : 'asc';
    else if (sortBy === 'date') orderBy.createdAt = sortOrder === 'asc' ? 'asc' : 'desc';
    else orderBy.createdAt = 'desc';

    const [listings, total] = await Promise.all([
      prisma.cropListing.findMany({
        where,
        orderBy,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: {
          farmer: { select: { id: true, name: true, state: true, district: true, trustScore: true, isVerified: true } },
        },
      }),
      prisma.cropListing.count({ where }),
    ]);

    res.json({ listings, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) { next(err); }
});

router.get('/mine', authenticate, authorize('FARMER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const listings = await prisma.cropListing.findMany({
      where: { farmerId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ listings });
  } catch (err) { next(err); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const listing = await prisma.cropListing.findUnique({
      where: { id: req.params.id },
      include: {
        farmer: {
          select: {
            id: true, name: true, email: true, phone: true, state: true, district: true,
            trustScore: true, isVerified: true, isOrganic: true, avatar: true, createdAt: true,
          },
        },
      },
    });
    if (!listing) throw new AppError('Listing not found', 404);
    res.json({ listing });
  } catch (err) { next(err); }
});

router.post('/', authenticate, authorize('FARMER'), validate(createListingSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { cropName, variety, quantity, unit, price, state, district, images, harvestDate, organicCertified, description } = req.body;

    let imageUrls: string[] = [];
    if (images && images.length > 0) {
      imageUrls = await uploadMultipleToCloudinary(images);
    }

    const listing = await prisma.cropListing.create({
      data: {
        cropName, variety, quantity, unit, price, state, district,
        images: imageUrls,
        harvestDate: harvestDate ? new Date(harvestDate) : null,
        organicCertified: organicCertified || false,
        description,
        farmerId: req.user!.id,
      },
    });

    await logAudit('CREATE_LISTING', 'CropListing', listing.id, req.user!.id, undefined, { cropName, price, state, district }, req.ip);
    await cacheDel(`listings:*`);

    res.status(201).json({ listing });
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, authorize('FARMER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const listing = await prisma.cropListing.findUnique({ where: { id: req.params.id } });
    if (!listing) throw new AppError('Listing not found', 404);
    if (listing.farmerId !== req.user!.id) throw new AppError('Not authorized', 403);

    const updateData = { ...req.body, updatedAt: new Date() };
    if (updateData.images) {
      updateData.images = await uploadMultipleToCloudinary(updateData.images);
    }

    const updated = await prisma.cropListing.update({
      where: { id: req.params.id },
      data: updateData,
    });

    await logAudit('UPDATE_LISTING', 'CropListing', req.params.id, req.user!.id, { price: listing.price, status: listing.status }, { price: updated.price, status: updated.status }, req.ip);
    await cacheDel(`listings:*`);

    res.json({ listing: updated });
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, authorize('FARMER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const listing = await prisma.cropListing.findUnique({ where: { id: req.params.id } });
    if (!listing) throw new AppError('Listing not found', 404);
    if (listing.farmerId !== req.user!.id) throw new AppError('Not authorized', 403);

    await prisma.cropListing.delete({ where: { id: req.params.id } });

    await logAudit('DELETE_LISTING', 'CropListing', req.params.id, req.user!.id, { cropName: listing.cropName }, undefined, req.ip);
    await cacheDel(`listings:*`);

    res.json({ message: 'Listing deleted' });
  } catch (err) { next(err); }
});

export default router;
