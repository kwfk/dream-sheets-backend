import express from "express";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

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

const port = parseInt(process.env.PORT || "") || 8080;
app.listen(port, () => {
  console.log(`Listen on the port ${port}...`);
});
