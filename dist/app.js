"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.static("public"));
app.get("/", (req, res) => {
    const prompt = req.query.prompt;
    console.log("prompt: ", prompt);
    const files = fs_1.default.readdirSync(path_1.default.join(__dirname, "public"));
    const rand = Math.floor(Math.random() * files.length);
    res.redirect(`/${files[rand]}`);
});
const port = parseInt(process.env.PORT || "") || 8080;
app.listen(port, () => {
    console.log(`Listen on the port ${port}...`);
});
