// src/app.ts
import express from "express";
import prisma from "./client";
import artworkRouter from "./routes/artwork";  // ← import your artwork routes

const app = express();
app.use(express.json());

// mount your CRUD routes under /api
app.use("/api", artworkRouter);

// existing GET (you can remove if duplicated by your router)
app.get("/artworks", async (req, res) => {
  const artworks = await prisma.artwork.findMany();
  res.json(artworks);
});

app.listen(4000, () => console.log("Listening on 4000"));
