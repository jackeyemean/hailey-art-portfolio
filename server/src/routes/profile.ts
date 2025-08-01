import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { uploadToS3 } from '../s3';
import { requireAdminKey } from '../requireAdminKey';

const router = Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

// Get profile (public endpoint)
router.get('/', async (req, res) => {
  try {
    const profile = await prisma.profile.findFirst();
    res.json(profile || { imageUrl: null, description: null });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update profile (admin only)
router.put('/', requireAdminKey, upload.single('image'), async (req, res) => {
  try {
    const { description } = req.body;
    let imageUrl = null;

    // Upload image if provided
    if (req.file) {
      const key = `profile/${Date.now()}-${req.file.originalname}`;
      imageUrl = await uploadToS3(req.file.buffer, key, req.file.mimetype);
    }

    // Get or create profile
    let profile = await prisma.profile.findFirst();
    
    if (profile) {
      // Update existing profile
      profile = await prisma.profile.update({
        where: { id: profile.id },
        data: {
          description: description || profile.description,
          imageUrl: imageUrl || profile.imageUrl,
        },
      });
    } else {
      // Create new profile
      profile = await prisma.profile.create({
        data: {
          description: description || null,
          imageUrl: imageUrl || null,
        },
      });
    }

    res.json(profile);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router; 