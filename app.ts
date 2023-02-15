import express, { Response } from "express";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import md5 from "md5";
import { generateImage } from "./stable-diffusion";
import { GPT } from "./openai";

dotenv.config();
const app = express();

app.use("/ftp", express.static("imgs"));

const mime = {
  jpg: "image/jpeg",
  png: "image/png",
};

/**
 * Read image file at filepath and serve it as the response
 */
const serveImage = (filepath: string, res: Response) => {
  const ext = path.extname(filepath).slice(1);
  let type = "text/plain";
  if (ext === "jpg" || ext === "png") type = mime[ext];
  const s = fs.createReadStream(filepath);
  s.on("open", () => {
    res.set("Content-Type", type);
    s.pipe(res);
  });
  s.on("error", () => {
    res.set("Content-Type", "text/plain");
    res.status(404).end("Not found");
  });
};

app.get("/", async (req, res) => {
  const { prompt, seed: reqSeed } = req.query;
  if (typeof prompt !== "string") {
    res.status(401).send("Need a prompt as a string");
    return;
  }
  let seed = 1234;
  if (reqSeed && typeof reqSeed === "number") {
    seed = parseInt(reqSeed);
  }

  const hash = md5(prompt);
  const imgUrl =
    req.protocol + "://" + req.get("host") + "/ftp/" + hash + ".png";
  console.log(req.originalUrl);

  // check if image file with hash exists
  const files = fs.readdirSync(path.join(__dirname, "..", "imgs"));
  const cachedImage = files.find((f) => f.split(".")[0] === hash);
  if (cachedImage) {
    res.send(imgUrl);
  } else {
    // generate new image with prompt
    const { base64Image } = await generateImage(prompt, seed);
    const img = Buffer.from(base64Image, "base64");
    fs.writeFile(
      path.join(__dirname, "..", "imgs", `${hash}.png`),
      img,
      (err) => {
        if (err) throw err;
        console.log("image has been saved");
        res.send(imgUrl);
      }
    );
  }
});

app.get("/random", (req, res) => {
  const files = fs.readdirSync(path.join(__dirname, "/../imgs"));
  if (files.length === 0) {
    res.status(404).end("Not found");
    return;
  }
  const rand = Math.floor(Math.random() * files.length);

  const img = path.join(__dirname, "..", "imgs", files[rand]);

  serveImage(img, res);
});

// app.get("/generate", async (req, res) => {
//   const { prompt } = req.query;
//   if (typeof prompt !== "string") {
//     res.status(401).send("Need a prompt as a string");
//     return;
//   }

//   const hash = md5(prompt);

//   // check if image file with hash exists
//   const files = fs.readdirSync(path.join(__dirname, "..", "imgs"));
//   const cachedImage = files.find((f) => f.split(".")[0] === hash);
//   if (cachedImage) {
//     const cachedImagePath = path.join(__dirname, "..", "imgs", cachedImage);
//     serveImage(cachedImagePath, res);
//     return;
//   }

//   // generate new image with prompt
//   const { seed, base64Image } = await generateImage(prompt);
//   const img = Buffer.from(base64Image, "base64");
//   fs.writeFile(path.join(__dirname, "/../imgs", `${hash}.png`), img, (err) => {
//     if (err) throw err;
//     console.log("image has been saved");
//   });

//   res.writeHead(200, {
//     "Content-Type": "image/png",
//     "Content-Length": img.length,
//   });
//   res.end(img);
// });

app.get("/gpt", async (req, res) => {
  const { prompt, n, temperature } = req.query;
  console.log(prompt);
  if (typeof prompt !== "string") {
    res.status(401).send("Need a prompt as a string");
    return;
  }

  let num_choices = undefined;
  if (n && typeof n === "string") {
    num_choices = parseInt(n);
  }

  let temp_choice = undefined;
  if (temperature && typeof temperature === "string") {
    temp_choice = parseFloat(temperature);
  }

  try {
    const result = await GPT(prompt, num_choices, temp_choice);
    res.status(200).send(result);
  } catch (err) {
    res.status(500).send("Failed to get GPT response");
  }
});

const port = parseInt(process.env.PORT || "") || 8080;
app.listen(port, () => {
  console.log(`Listen on the port ${port}...`);
});
