const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();

app.use(express.static("public"));

app.get("/", (req, res) => {
  const files = fs.readdirSync(path.join(__dirname, "public"));
  const rand = Math.floor(Math.random() * files.length);
  res.redirect(`/${files[rand]}`);
});

app.listen(3000, () => {
  console.log("Listen on the port 3000...");
});
