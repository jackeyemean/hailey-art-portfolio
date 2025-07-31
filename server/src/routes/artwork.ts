// src/routes/artwork.ts
import express from "express";
import multer from "multer";
import prisma from "../client";
import { uploadToS3, deleteFromS3 } from "../s3";
import { requireAdminKey } from "../requireAdminKey";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Create
router.post(
  "/artworks",
  requireAdminKey,
  upload.single("image"),
  async (req, res, next) => {
    try {
      const { buffer, originalname, mimetype } = req.file!;
      const imageUrl = await uploadToS3(buffer, originalname, mimetype);

      // If this artwork is being set as artist's pick, unset any existing artist's pick
      if (req.body.isArtistPick === 'true') {
        await prisma.artwork.updateMany({
          where: { isArtistPick: true },
          data: { isArtistPick: false }
        });
      }

      const artwork = await prisma.artwork.create({
        data: {
          title:       req.body.title,
          description: req.body.description,
          imageUrl,
          collection:  req.body.collection,
          medium:      req.body.medium,
          dimensions:  req.body.dimensions,
          isArtistPick: req.body.isArtistPick === 'true',
        },
      });

      res.status(201).json(artwork);
    } catch (err) {
      next(err);
    }
  }
);

// List all those in a given collection
router.get("/artworks", async (req, res, next) => {
  try {
    const { collection } = req.query as { collection?: string };
    const artworks = await prisma.artwork.findMany({
      where: collection
        ? { collection }            // filter if ?collection=2025
        : {},                       // no filter otherwise
    });
    res.json(artworks);
  } catch (err) {
    next(err);
  }
});

// Fetch artist's pick
router.get("/artworks/artist-pick", async (req, res, next) => {
  try {
    const artistPick = await prisma.artwork.findFirst({
      where: { isArtistPick: true },
    });
    res.json(artistPick);
  } catch (err) {
    next(err);
  }
});

// Fetch one by ID
router.get("/artworks/:id", async (req, res, next) => {
  try {
    const art = await prisma.artwork.findUnique({
      where: { id: req.params.id },
    });
    if (!art) return res.sendStatus(404);
    res.json(art);
  } catch (err) {
    next(err);
  }
});

// UPDATE a record, optionally replace its image
router.put(
  "/artworks/:id",
  requireAdminKey,
  upload.single("image"),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        collection,
        medium,
        dimensions,
        isArtistPick,
      } = req.body;

      // fetch record
      const existing = await prisma.artwork.findUnique({ where: { id } });
      if (!existing) return res.sendStatus(404);

      let imageUrl = existing.imageUrl;

      // if new pic uploaded, delete old & upload new pic
      if (req.file) {
        const oldKey = new URL(existing.imageUrl).pathname.slice(1);
        await deleteFromS3(oldKey);

        const { buffer, originalname, mimetype } = req.file;
        imageUrl = await uploadToS3(buffer, originalname, mimetype);
      }

      // If this artwork is being set as artist's pick, unset any existing artist's pick
      if (isArtistPick === 'true') {
        await prisma.artwork.updateMany({
          where: { 
            isArtistPick: true,
            id: { not: id } // Don't unset the current artwork
          },
          data: { isArtistPick: false }
        });
      }

      // update all fields
      const updated = await prisma.artwork.update({
        where: { id },
        data: {
          title,
          description,
          collection,
          medium,
          dimensions,
          imageUrl,
          isArtistPick: isArtistPick === 'true',
        },
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// Delete
router.delete(
  "/artworks/:id",
  requireAdminKey,           // ← protect this
  async (req, res, next) => {
  try {
    const { id } = req.params;

    const art = await prisma.artwork.findUnique({ where: { id } });
    if (!art) return res.status(404).json({ success: false, message: "Not found" });

    // derive S3 key
    const url = new URL(art.imageUrl);
    const key = url.pathname.slice(1);

    await deleteFromS3(key);
    await prisma.artwork.delete({ where: { id } });

    return res.status(200).json({
      success: true,
      id,
      deletedImageKey: key,
      imageUrl: art.imageUrl,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
