import express from "express";
import artworkRouter from "./routes/artwork";

const app = express();
app.use(express.json());

app.use("/api", artworkRouter);

app.listen(4000, () => console.log("Listening on 4000"));
