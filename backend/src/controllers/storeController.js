const prisma = require('../prisma');

// Field selection helper to exclude createdAt, updatedAt, and deletedAt
const storeSelect = {
  id: true,
  name: true,
  userId: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  addresses: {
    where: {
      deletedAt: null, // Exclude soft-deleted addresses
    },
    select: {
      id: true,
      storeId: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      pincode: true,
      latitude: true,
      longitude: true,
    },
  },
};

/**
 * Create a new store with address and coordinates
 * Allowed roles: owner (shop owner) or admin
 */
async function createStore(req, res) {
  try {
    const { name, addressLine1, addressLine2, city, state, pincode, latitude, longitude } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Store name is required' });
    }

    if (!addressLine1 || !city || !state || !pincode || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Complete address details (addressLine1, city, state, pincode, latitude, longitude) are required',
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude or longitude values. Latitude must be between -90 and 90, longitude between -180 and 180',
      });
    }

    const newStore = await prisma.store.create({
      data: {
        name: name.trim(),
        userId: req.user.id,
        addresses: {
          create: {
            addressLine1: addressLine1.trim(),
            addressLine2: addressLine2 ? addressLine2.trim() : null,
            city: city.trim(),
            state: state.trim(),
            pincode: pincode.trim(),
            latitude: lat,
            longitude: lng,
          },
        },
      },
      select: storeSelect,
    });

    return res.status(201).json({
      success: true,
      message: 'Store created successfully',
      store: newStore,
    });
  } catch (error) {
    console.error('Create Store Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create store',
      error: error.message,
    });
  }
}

/**
 * Get all stores with advanced search filters and pagination
 */
async function getAllStores(req, res) {
  try {
    const { search, city, state, pincode, page = 1, limit = 10 } = req.query;

    const pageNumber = Math.max(1, parseInt(page, 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNumber - 1) * pageSize;

    // Filter out soft-deleted stores (where deletedAt is null)
    const where = {
      deletedAt: null,
    };

    if (search) {
      where.name = { contains: search.trim(), mode: 'insensitive' };
    }

    const addressFilter = {};
    if (city) addressFilter.city = { contains: city.trim(), mode: 'insensitive' };
    if (state) addressFilter.state = { contains: state.trim(), mode: 'insensitive' };
    if (pincode) addressFilter.pincode = { contains: pincode.trim() };

    if (Object.keys(addressFilter).length > 0) {
      where.addresses = {
        some: {
          ...addressFilter,
          deletedAt: null, // Exclude soft-deleted addresses in search
        },
      };
    }

    const [total, stores] = await Promise.all([
      prisma.store.count({ where }),
      prisma.store.findMany({
        where,
        select: storeSelect,
        orderBy: { id: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return res.status(200).json({
      success: true,
      pagination: {
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
      stores,
    });
  } catch (error) {
    console.error('Get All Stores Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve stores',
      error: error.message,
    });
  }
}

/**
 * Find nearest stores from customer location using Haversine formula
 */
async function getNearestStores(req, res) {
  try {
    const { lat, lng, radius = 10, page = 1, limit = 10, search } = req.query;

    const searchQuery = search ? search.trim() : '';

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Both lat (latitude) and lng (longitude) query parameters are required',
      });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const radiusInKm = parseFloat(radius);
    const pageNumber = Math.max(1, parseInt(page, 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const offset = (pageNumber - 1) * pageSize;

    if (isNaN(userLat) || isNaN(userLng) || isNaN(radiusInKm)) {
      return res.status(400).json({
        success: false,
        message: 'lat, lng, and radius must be valid numbers',
      });
    }

    // Haversine formula query in PostgreSQL - excludes deletedAt IS NOT NULL and omits createdAt/updatedAt
    const nearestStores = await prisma.$queryRaw`
      SELECT 
        s.id AS "storeId",
        s.name AS "storeName",
        s."userId" AS "ownerId",
        u.name AS "ownerName",
        u.email AS "ownerEmail",
        sa.id AS "addressId",
        sa."addressLine1",
        sa."addressLine2",
        sa.city,
        sa.state,
        sa.pincode,
        sa.latitude,
        sa.longitude,
        ROUND(
          (
            6371 * acos(
              LEAST(1.0, GREATEST(-1.0,
                cos(radians(${userLat})) * cos(radians(sa.latitude)) *
                cos(radians(sa.longitude) - radians(${userLng})) +
                sin(radians(${userLat})) * sin(radians(sa.latitude))
              ))
            )
          )::numeric, 2
        )::float AS "distanceInKm"
      FROM stores s
      JOIN store_addresses sa ON s.id = sa."storeId"
      JOIN users u ON s."userId" = u.id
      WHERE sa."deletedAt" IS NULL
        AND s."deletedAt" IS NULL
        AND u."deletedAt" IS NULL
        AND (${searchQuery} = '' OR s.name ILIKE '%' || ${searchQuery} || '%')
        AND (
          6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians(${userLat})) * cos(radians(sa.latitude)) *
              cos(radians(sa.longitude) - radians(${userLng})) +
              sin(radians(${userLat})) * sin(radians(sa.latitude))
            ))
          )
        ) <= ${radiusInKm}
      ORDER BY "distanceInKm" ASC
      LIMIT ${pageSize} OFFSET ${offset};
    `;

    const mappedStores = nearestStores.map(store => ({
      id: store.storeId,
      name: store.storeName,
      userId: store.ownerId,
      user: {
        id: store.ownerId,
        name: store.ownerName,
        email: store.ownerEmail,
      },
      addresses: [{
        id: store.addressId,
        storeId: store.storeId,
        addressLine1: store.addressLine1,
        addressLine2: store.addressLine2,
        city: store.city,
        state: store.state,
        pincode: store.pincode,
        latitude: store.latitude,
        longitude: store.longitude,
      }],
      distance: store.distanceInKm,
    }));

    return res.status(200).json({
      success: true,
      userLocation: { latitude: userLat, longitude: userLng },
      radiusInKm,
      page: pageNumber,
      count: mappedStores.length,
      stores: mappedStores,
    });
  } catch (error) {
    console.error('Nearest Stores Calculation Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate nearest stores',
      error: error.message,
    });
  }
}

/**
 * Get all stores belonging to the currently logged in shop owner
 */
async function getMyStores(req, res) {
  try {
    const stores = await prisma.store.findMany({
      where: {
        userId: req.user.id,
        deletedAt: null, // Exclude soft-deleted stores
      },
      select: storeSelect,
      orderBy: { id: 'desc' },
    });

    return res.status(200).json({
      success: true,
      stores,
    });
  } catch (error) {
    console.error('Get My Stores Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve your stores',
      error: error.message,
    });
  }
}

/**
 * Get single store by ID
 */
async function getStoreById(req, res) {
  try {
    const storeId = parseInt(req.params.id, 10);
    if (isNaN(storeId)) {
      return res.status(400).json({ success: false, message: 'Invalid store ID' });
    }

    const store = await prisma.store.findFirst({
      where: {
        id: storeId,
        deletedAt: null, // Exclude soft-deleted store
      },
      select: storeSelect,
    });

    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    return res.status(200).json({ success: true, store });
  } catch (error) {
    console.error('Get Store By ID Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve store',
      error: error.message,
    });
  }
}

/**
 * Update store details and address
 */
async function updateStore(req, res) {
  try {
    const storeId = parseInt(req.params.id, 10);
    if (isNaN(storeId)) {
      return res.status(400).json({ success: false, message: 'Invalid store ID' });
    }

    const existingStore = await prisma.store.findFirst({
      where: { id: storeId, deletedAt: null },
      include: { addresses: { where: { deletedAt: null } } },
    });

    if (!existingStore) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    // Only store owner or admin can update
    const isAdmin = req.user.role.roleName.toLowerCase() === 'admin';
    if (!isAdmin && existingStore.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied: You do not own this store' });
    }

    const { name, addressLine1, addressLine2, city, state, pincode, latitude, longitude } = req.body;

    const updatedStore = await prisma.$transaction(async (tx) => {
      // 1. Update store name if provided
      if (name && name.trim()) {
        await tx.store.update({
          where: { id: storeId },
          data: { name: name.trim() },
        });
      }

      // 2. Update address if provided
      if (addressLine1 || city || state || pincode || latitude !== undefined || longitude !== undefined) {
        const addressData = {};
        if (addressLine1) addressData.addressLine1 = addressLine1.trim();
        if (addressLine2 !== undefined) addressData.addressLine2 = addressLine2 ? addressLine2.trim() : null;
        if (city) addressData.city = city.trim();
        if (state) addressData.state = state.trim();
        if (pincode) addressData.pincode = pincode.trim();
        if (latitude !== undefined) addressData.latitude = parseFloat(latitude);
        if (longitude !== undefined) addressData.longitude = parseFloat(longitude);

        const primaryAddress = existingStore.addresses[0];
        if (primaryAddress) {
          await tx.storeAddress.update({
            where: { id: primaryAddress.id },
            data: addressData,
          });
        }
      }

      return tx.store.findUnique({
        where: { id: storeId },
        select: storeSelect,
      });
    });

    return res.status(200).json({
      success: true,
      message: 'Store updated successfully',
      store: updatedStore,
    });
  } catch (error) {
    console.error('Update Store Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update store',
      error: error.message,
    });
  }
}

/**
 * Soft delete store
 */
async function deleteStore(req, res) {
  try {
    const storeId = parseInt(req.params.id, 10);
    if (isNaN(storeId)) {
      return res.status(400).json({ success: false, message: 'Invalid store ID' });
    }

    const existingStore = await prisma.store.findFirst({
      where: { id: storeId, deletedAt: null },
    });

    if (!existingStore) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    const isAdmin = req.user.role.roleName.toLowerCase() === 'admin';
    if (!isAdmin && existingStore.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied: You do not own this store' });
    }

    // Soft delete store and its addresses
    await prisma.$transaction([
      prisma.store.update({
        where: { id: storeId },
        data: { deletedAt: new Date() },
      }),
      prisma.storeAddress.updateMany({
        where: { storeId },
        data: { deletedAt: new Date() },
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Store deleted successfully',
    });
  } catch (error) {
    console.error('Delete Store Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete store',
      error: error.message,
    });
  }
}

module.exports = {
  createStore,
  getAllStores,
  getNearestStores,
  getMyStores,
  getStoreById,
  updateStore,
  deleteStore,
};
