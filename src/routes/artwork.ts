// src/routes/artwork.ts
import express from "express";
import multer from "multer";
import prisma from "../client";
import { uploadToS3, deleteFromS3 } from "../s3";

const router = express.Router();
// In-memory so we can get a Buffer
const upload = multer({ storage: multer.memoryStorage() });

// Create
router.post(
  "/artworks",
  upload.single("image"),
  async (req, res, next) => {
    try {
      const { buffer, originalname, mimetype } = req.file!;
      const imageUrl = await uploadToS3(buffer, originalname, mimetype);

      const artwork = await prisma.artwork.create({
        data: {
          title:       req.body.title,
          description: req.body.description,
          imageUrl,
          collection:  req.body.collection,
          medium:      req.body.medium,
          dimensions:  req.body.dimensions,
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

// Delete
router.delete("/artworks/:id", async (req, res, next) => {
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
