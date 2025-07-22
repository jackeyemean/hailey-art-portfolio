// src/app.ts
import express from "express";
import prisma from "./client";
import artworkRouter from "./routes/artwork";

const app = express();
app.use(express.json());

app.use("/api", artworkRouter);

app.get("/artworks", async (req, res) => {
  const artworks = await prisma.artwork.findMany();
  res.json(artworks);
});

app.listen(4000, () => console.log("Listening on 4000"));
