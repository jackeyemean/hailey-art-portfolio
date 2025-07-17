import express from 'express';
import prisma from './client';

const app = express();
app.use(express.json());

// routes
app.get('/artworks', async (req, res) => {
  try {
    const artworks = await prisma.artwork.findMany();
    res.json(artworks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.listen(4000, () => console.log('Listening on 4000'));
