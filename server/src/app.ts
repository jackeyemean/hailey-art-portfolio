import "dotenv/config";
import express from "express";
import artworkRouter from "./routes/artwork";
import profileRouter from "./routes/profile";

const app = express();
app.use(express.json());

app.use("/api", artworkRouter);
app.use("/api/profile", profileRouter);

app.listen(4000, '0.0.0.0', () => {
  console.log('Listening on 0.0.0.0:4000');
});