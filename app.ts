import express, { Response } from "express";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import md5 from "md5";
import { generateImage } from "./stable-diffusion";
import { GPT, ListGPT } from "./openai";

const DEFAULT_SEED = 1234;

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
  const { prompt, seed: reqSeed, cfg: reqCFG } = req.query;
  if (typeof prompt !== "string") {
    res.status(401).send("Need a prompt as a string");
    return;
  }
  let seed = DEFAULT_SEED;
  if (reqSeed && typeof reqSeed === "string" && parseInt(reqSeed)) {
    seed = parseInt(reqSeed);
  }
  let cfg = 13;
  if (reqCFG && typeof reqCFG === "string" && parseInt(reqCFG)) {
    cfg = parseInt(reqCFG);
  }
  if (cfg < 0 || cfg > 35) {
    res.status(401).send("CFG must be between 0 and 35");
  }

  const hash = md5(`seed=${seed}&cfg=${cfg}&${prompt}`);
  const imgUrl =
    req.protocol + "://" + req.get("host") + "/ftp/" + hash + ".png";
  console.log(req.originalUrl, hash);

  // log
  if (process.env.PARTICIPANT_ID) {
    const date = new Date(Date.now());
    const timestamp = date
      .toLocaleTimeString("en-US", { hour12: false })
      .toString();

    const log = `ts=${timestamp} | fn=TTI | prompt="${prompt}" | seed=${seed} | cfg=${cfg}\n`;
    fs.appendFile(`logs/${process.env.PARTICIPANT_ID}-logs.txt`, log, (err) => {
      if (err) console.log("failed to log TTI");
    });
  }

  // check if image file with hash exists
  const files = fs.readdirSync(path.join(__dirname, "..", "imgs"));
  const cachedImage = files.find((f) => f.split(".")[0] === hash);
  if (cachedImage) {
    res.send(imgUrl);
  } else {
    // generate new image with prompt
    try {
      const { base64Image } = await generateImage(prompt, seed, cfg);
      const img = Buffer.from(base64Image, "base64");
      fs.writeFile(
        path.join(__dirname, "..", "imgs", `${hash}.png`),
        img,
        (err) => {
          if (err) throw err;
          console.log(`image ${hash} has been saved with prompt: ${prompt}`);
          res.send(imgUrl);
        }
      );
    } catch (err) {
      console.error(err);
      if (err === "NSFW")
        return res
          .status(403)
          .send("Your image was filtered by the NSFW classifier.");
      res.status(500).send("Failed to generate image");
    }
  }
});

// app.get("/img2img", async (req, res) => {
//   const { prompt, image, seed: reqSeed } = req.query;
//   if (typeof prompt !== "string") {
//     res.status(401).send("Need a prompt as a string");
//     return;
//   }
//   let seed = DEFAULT_SEED;
//   if (reqSeed && typeof reqSeed === "string" && parseInt(reqSeed)) {
//     seed = parseInt(reqSeed);
//   }

//   const hash = md5(`seed=${seed}&${prompt}`);
//   const imgUrl =
//     req.protocol + "://" + req.get("host") + "/ftp/" + hash + ".png";
//   console.log(req.originalUrl, hash);
// });

// app.get("/random", (req, res) => {
//   const files = fs.readdirSync(path.join(__dirname, "/../imgs"));
//   if (files.length === 0) {
//     res.status(404).end("Not found");
//     return;
//   }
//   const rand = Math.floor(Math.random() * files.length);

//   const img = path.join(__dirname, "..", "imgs", files[rand]);

//   serveImage(img, res);
// });

app.get("/gpt", async (req, res) => {
  const { prompt, n, temperature, stop, max_tokens } = req.query;
  console.log("gpt:", prompt);
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

  let stop_choice = undefined;
  if (stop && typeof stop === "string") {
    stop_choice = stop;
  }
  let token_choice = undefined;
  if (max_tokens && typeof max_tokens === "string") {
    token_choice = parseInt(max_tokens);
  }

  // log
  if (process.env.PARTICIPANT_ID) {
    const date = new Date(Date.now());
    const timestamp = date
      .toLocaleTimeString("en-US", { hour12: false })
      .toString();

    let log;
    if (/^Embellish this sentence:/.test(prompt)) {
      log = `ts=${timestamp} | fn=EMBELLISH | prompt="${prompt}" | n=${num_choices} | temp=${temp_choice} | stop=${stop_choice} | max_tokens=${token_choice}\n`;
    } else {
      log = `ts=${timestamp} | fn=GPT | prompt="${prompt}" | n=${num_choices} | temp=${temp_choice} | stop=${stop_choice} | max_tokens=${token_choice}\n`;
    }

    fs.appendFile(`logs/${process.env.PARTICIPANT_ID}-logs.txt`, log, (err) => {
      if (err) console.log("failed to log GPT");
    });
  }

  try {
    const result = await GPT(
      prompt,
      num_choices,
      temp_choice,
      token_choice,
      stop_choice
    );
    res.status(200).send(result);
  } catch (err) {
    res.status(500).send("Failed to get GPT response");
  }
});

app.get("/listgpt", async (req, res) => {
  const { prompt, length: reqLength } = req.query;
  console.log("list gpt:", prompt);
  if (typeof prompt !== "string") {
    return res.status(401).send("Need a prompt as a string");
  }

  let length = 5;
  if (reqLength && typeof reqLength === "string") {
    const n = parseInt(reqLength);
    if (!Number.isNaN(n)) length = n;
  }

  // log
  if (process.env.PARTICIPANT_ID) {
    const date = new Date(Date.now());
    const timestamp = date
      .toLocaleTimeString("en-US", { hour12: false })
      .toString();

    let log;
    if (/^similar items to this list without repeating/.test(prompt)) {
      log = `ts=${timestamp} | fn=LIST_COMPLETION | prompt="${prompt}" | length=${length}\n`;
    } else if (/^synonyms of/.test(prompt)) {
      log = `ts=${timestamp} | fn=SYNONYMS | prompt="${prompt}" | length=${length}\n`;
    } else if (/^antonyms of/.test(prompt)) {
      log = `ts=${timestamp} | fn=ANTONYMS | prompt="${prompt}" | length=${length}\n`;
    } else if (/^divergent words to/.test(prompt)) {
      log = `ts=${timestamp} | fn=DIVERGENTS | prompt="${prompt}" | length=${length}\n`;
    } else if (/^alternative ways to say/.test(prompt)) {
      log = `ts=${timestamp} | fn=ALTERNATIVES | prompt="${prompt}" | length=${length}\n`;
    } else {
      log = `ts=${timestamp} | fn=GPT_LIST | prompt="${prompt}" | length=${length}\n`;
    }

    fs.appendFile(`logs/${process.env.PARTICIPANT_ID}-logs.txt`, log, (err) => {
      if (err) console.log("failed to log LIST_GPT");
    });
  }

  try {
    let result;
    let i = 3;
    do {
      result = await ListGPT(prompt, length);
      i -= 1;
    } while (i > 0 && result.length < length);
    if (result.length > length) {
      result = result.slice(0, length);
    }
    res.status(200).send(JSON.stringify(result));
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
});

const port = parseInt(process.env.PORT || "") || 8080;
app.listen(port, () => {
  console.log(`Listen on the port ${port}...`);
});
