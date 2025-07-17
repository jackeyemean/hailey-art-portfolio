import express from 'express';

const app = express();
app.use(express.json());

// routes


app.listen(4000, () => console.log('Listening on 4000'));
