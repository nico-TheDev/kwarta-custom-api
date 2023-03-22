const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const { scrapeLogic } = require("./scrapeLogic");

require("dotenv").config();

const app = express();

app.use(morgan("dev"));
app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Custom API for Kwarta !");
});

app.get("/api", (req, res) => {
    scrapeLogic(res);
});

module.exports = app;
