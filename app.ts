import express from "express";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { generateImage } from "./image-generation";

dotenv.config();
const app = express();

app.use(express.static("public"));

app.get("/", (req, res) => {
  const prompt = req.query.prompt;
  console.log("prompt: ", prompt);
  const files = fs.readdirSync(path.join(__dirname, "public"));
  const rand = Math.floor(Math.random() * files.length);
  res.redirect(`/${files[rand]}`);
});

app.get("/generate", async (req, res) => {
  const { prompt } = req.query;
  if (typeof prompt !== "string") {
    res.status(401).send("Need a prompt as a string");
    return;
  }

  const { seed, base64Image } = await generateImage(prompt);
  const img = Buffer.from(base64Image, "base64");

  res.writeHead(200, {
    "Content-Type": "image/png",
    "Content-Length": img.length,
  });
  res.end(img);
});

const port = parseInt(process.env.PORT || "") || 8080;
app.listen(port, () => {
  console.log(`Listen on the port ${port}...`);
});
