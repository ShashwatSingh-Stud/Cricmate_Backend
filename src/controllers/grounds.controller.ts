import { Response, NextFunction } from 'express';
import { prisma } from '../server';
import { AuthenticatedRequest, GroundFilters, parsePagination } from '../types';
import { sendSuccess, sendPaginated, buildPagination } from '../utils/response';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { geocodeAddress } from '../services/geocoding.service';
import { uploadGroundPhoto, deletePhoto as deletePhotoFromStorage } from '../services/storage.service';
import { STORAGE_BUCKETS, NEARBY } from '../utils/constants';

// ─── Search & Discovery ───────────────────────────────────────────────────────

export const listGrounds = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const filters = req.query as GroundFilters;
    const paginationParams = parsePagination(req.query);

    const where: any = { isActive: true };

    if (filters.city) {
      where.city = { equals: filters.city, mode: 'insensitive' };
    }
    if (filters.pitchType) {
      where.pitchType = filters.pitchType;
    }
    if (filters.hasLighting !== undefined) {
      where.hasLighting = filters.hasLighting === 'true';
    }
    if (filters.hasNets !== undefined) {
      where.hasNets = filters.hasNets === 'true';
    }
    if (filters.priceMin || filters.priceMax) {
      where.pricePerSlot = {} as any;
      if (filters.priceMin) where.pricePerSlot.gte = parseInt(filters.priceMin, 10);
      if (filters.priceMax) where.pricePerSlot.lte = parseInt(filters.priceMax, 10);
    }

    const [grounds, total] = await Promise.all([
      prisma.ground.findMany({
        where,
        skip: paginationParams.skip,
        take: paginationParams.limit,
        include: {
          photos: { where: { isPrimary: true }, take: 1 },
        },
        orderBy: { avgRating: 'desc' },
      }),
      prisma.ground.count({ where }),
    ]);

    sendPaginated(res, grounds, buildPagination(paginationParams.page, paginationParams.limit, total));
  } catch (error) {
    next(error);
  }
};

export const nearbyGrounds = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const lat = req.query.lat as string;
    const lng = req.query.lng as string;
    const radiusKm = req.query.radiusKm as string | undefined;
    
    if (!lat || !lng) {
      throw new BadRequestError('Latitude and longitude are required');
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radius = radiusKm ? parseFloat(radiusKm) : NEARBY.DEFAULT_RADIUS_KM;

    // Using raw SQL for Haversine distance calculation
    const grounds = await prisma.$queryRaw`
      SELECT 
        g.*,
        (
          6371 * acos(
            cos(radians(${latitude})) * cos(radians(g.latitude)) * 
            cos(radians(g.longitude) - radians(${longitude})) + 
            sin(radians(${latitude})) * sin(radians(g.latitude))
          )
        ) AS distance
      FROM grounds g
      WHERE g.is_active = true
        AND (
          6371 * acos(
            cos(radians(${latitude})) * cos(radians(g.latitude)) * 
            cos(radians(g.longitude) - radians(${longitude})) + 
            sin(radians(${latitude})) * sin(radians(g.latitude))
          )
        ) <= ${radius}
      ORDER BY distance ASC
      LIMIT 50;
    `;

    // Fetch primary photos for these grounds
    const groundIds = (grounds as any[]).map(g => g.id);
    const photos = await prisma.groundPhoto.findMany({
      where: { groundId: { in: groundIds }, isPrimary: true },
    });

    const enrichedGrounds = (grounds as any[]).map(g => ({
      ...g,
      photos: photos.filter(p => p.groundId === g.id),
    }));

    sendSuccess(res, { grounds: enrichedGrounds });
  } catch (error) {
    next(error);
  }
};

export const getGround = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const groundId = req.params.id as string;
    const ground = await prisma.ground.findUnique({
      where: { id: groundId },
      include: {
        photos: { orderBy: { order: 'asc' } },
        equipmentRentals: { where: { isAvailable: true } },
        owner: { select: { name: true, phone: true } },
      },
    });

    if (!ground) throw new NotFoundError('Ground');

    sendSuccess(res, { ground });
  } catch (error) {
    next(error);
  }
};

// ─── Owner Management ─────────────────────────────────────────────────────────

export const createGround = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const addressDetails = `${req.body.addressLine}, ${req.body.city}, ${req.body.state} ${req.body.pincode}`;
    
    // Attempt geocoding
    const geo = await geocodeAddress(addressDetails);
    const latitude = geo?.latitude || 0;
    const longitude = geo?.longitude || 0;

    const ground = await prisma.$transaction(async (tx) => {
      // Create ground
      const newGround = await tx.ground.create({
        data: {
          ...req.body,
          ownerId: req.userId!,
          latitude,
          longitude,
        },
      });

      // Ensure user has ground owner role
      await tx.user.update({
        where: { id: req.userId! },
        data: { isGroundOwner: true },
      });

      return newGround;
    });

    sendSuccess(res, { ground }, 'Ground listed successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const updateGround = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const groundId = req.params.id as string;
    // If address changed, re-geocode
    let geoData = {};
    if (req.body.addressLine || req.body.city || req.body.pincode) {
      const ground = await prisma.ground.findUnique({ where: { id: groundId } });
      const address = `${req.body.addressLine || ground?.addressLine}, ${req.body.city || ground?.city}, ${req.body.state || ground?.state}`;
      const geo = await geocodeAddress(address);
      if (geo) {
        geoData = { latitude: geo.latitude, longitude: geo.longitude };
      }
    }

    const ground = await prisma.ground.update({
      where: { id: groundId },
      data: {
        ...req.body,
        ...geoData,
      },
    });

    sendSuccess(res, { ground }, 'Ground updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteGround = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const groundId = req.params.id as string;
    await prisma.ground.update({
      where: { id: groundId },
      data: { isActive: false },
    });
    sendSuccess(res, null, 'Ground deactivated successfully');
  } catch (error) {
    next(error);
  }
};

// ─── Photos ───────────────────────────────────────────────────────────────────

export const uploadPhoto = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { base64Image, isPrimary } = req.body;
    const groundId = req.params.id as string;

    if (!base64Image) {
      throw new BadRequestError('Base64 image data is required');
    }

    const url = await uploadGroundPhoto(base64Image, groundId);
    
    if (!url) {
      throw new Error('Failed to upload photo to storage');
    }

    const photoCount = await prisma.groundPhoto.count({ where: { groundId } });

    if (isPrimary) {
      await prisma.groundPhoto.updateMany({
        where: { groundId },
        data: { isPrimary: false },
      });
    }

    const photo = await prisma.groundPhoto.create({
      data: {
        groundId,
        url,
        isPrimary: isPrimary || photoCount === 0,
        order: photoCount,
      },
    });

    sendSuccess(res, { photo }, 'Photo uploaded successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const removePhoto = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const groundId = req.params.id as string;
    const photoId = req.params.photoId as string;

    const photo = await prisma.groundPhoto.findFirst({
      where: { id: photoId, groundId },
    });

    if (!photo) {
      throw new NotFoundError('Photo');
    }

    await deletePhotoFromStorage(STORAGE_BUCKETS.GROUND_PHOTOS, photo.url);
    await prisma.groundPhoto.delete({ where: { id: photoId } });

    sendSuccess(res, null, 'Photo deleted');
  } catch (error) {
    next(error);
  }
};

// ─── Availability & Slots ─────────────────────────────────────────────────────

export const getSlots = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const date = req.query.date as string;
    const groundId = req.params.id as string;

    if (!date) throw new BadRequestError('Date is required');

    // Check if whole day is blocked
    const parsedDate = new Date(date);
    const blocked = await prisma.blockedDate.findFirst({
      where: { groundId, date: parsedDate },
    });

    if (blocked) {
      return sendSuccess(res, { slots: [] }, 'Ground is blocked on this date');
    }

    // Get all defined slots
    const slots = await prisma.slot.findMany({
      where: { groundId, isActive: true },
      orderBy: { startTime: 'asc' },
    });

    // Find overlapping confirmed/pending bookings
    const startOfDay = new Date(parsedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(parsedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await prisma.booking.findMany({
      where: {
        groundId,
        date: { gte: startOfDay, lte: endOfDay },
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
      },
    });

    const bookedSlotIds = new Set(bookings.map(b => b.slotId));

    const availableSlots = slots.map(slot => ({
      ...slot,
      isAvailable: !bookedSlotIds.has(slot.id),
    }));

    sendSuccess(res, { slots: availableSlots });
  } catch (error) {
    next(error);
  }
};

export const blockDates = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { date, reason } = req.body;
    const groundId = req.params.id as string;
    const parsedDate = new Date(date);

    const blocked = await prisma.blockedDate.create({
      data: {
        groundId,
        date: parsedDate,
        reason,
      },
    });

    sendSuccess(res, { blocked }, 'Date blocked successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const unblockDate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const dateId = req.params.dateId as string;
    await prisma.blockedDate.delete({
      where: { id: dateId },
    });
    sendSuccess(res, null, 'Date unblocked');
  } catch (error) {
    next(error);
  }
};

// ─── Reviews ──────────────────────────────────────────────────────────────────

export const getReviews = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const groundId = req.params.id as string;
    const paginationParams = parsePagination(req.query);

    const [reviews, total] = await Promise.all([
      prisma.groundReview.findMany({
        where: { groundId },
        skip: paginationParams.skip,
        take: paginationParams.limit,
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.groundReview.count({ where: { groundId } }),
    ]);

    sendPaginated(res, reviews, buildPagination(paginationParams.page, paginationParams.limit, total));
  } catch (error) {
    next(error);
  }
};

export const postReview = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const groundId = req.params.id as string;
    const userId = req.userId!;
    const { rating, comment } = req.body;

    // Validate user has actually played at this ground
    const hasCompletedBooking = await prisma.booking.findFirst({
      where: {
        groundId,
        status: 'COMPLETED',
        OR: [
          { userId },
          { match: { players: { some: { userId } } } }
        ],
      },
    });

    if (!hasCompletedBooking) {
      throw new BadRequestError('You must complete a match at this ground before reviewing');
    }

    const review = await prisma.$transaction(async (tx) => {
      const newReview = await tx.groundReview.upsert({
        where: { groundId_userId: { groundId, userId } },
        update: { rating, comment },
        create: { groundId, userId, rating, comment },
      });

      // Recalculate average rating
      const aggr = await tx.groundReview.aggregate({
        where: { groundId },
        _avg: { rating: true },
        _count: { rating: true },
      });

      await tx.ground.update({
        where: { id: groundId },
        data: {
          avgRating: aggr._avg.rating || 0,
          reviewCount: aggr._count.rating || 0,
        },
      });

      return newReview;
    });

    sendSuccess(res, { review }, 'Review posted successfully', 201);
  } catch (error) {
    next(error);
  }
};
