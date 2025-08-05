import "dotenv/config";
import express from "express";
import artworkRouter from "./routes/artwork";
import profileRouter from "./routes/profile";

const app = express();
app.use(express.json());

app.use("/api", artworkRouter);
app.use("/api/profile", profileRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Listening on 0.0.0.0:${PORT}`);
});