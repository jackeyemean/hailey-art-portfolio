// src/routes/artwork.ts
import express from "express";
import multer from "multer";
import prisma from "../client";              // ← Pull in your PrismaClient instance
import { uploadToS3 } from "../s3";          // ← Adjust path if needed

const router = express.Router();
const upload = multer();

router.post(
  "/artworks",
  upload.single("image"),
  async (req, res, next) => {
    try {
      const { buffer, originalname, mimetype } = req.file!;
      const imageUrl = await uploadToS3(buffer, originalname, mimetype);

      const artwork = await prisma.artwork.create({
        data: {
          title: req.body.title,
          description: req.body.description,
          imageUrl,
          collection: req.body.collection,
          medium: req.body.medium,
          dimensions: req.body.dimensions,
        },
      });

      res.status(201).json(artwork);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
