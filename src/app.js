const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const { scrapeInflation, scrapeInvestments, scrapeNews, scrapeStocks } = require("./scrapeLogic");

require("dotenv").config();

const app = express();

app.use(morgan("combined"));
app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Custom API for CASH !");
});

app.get("/inflation", (req, res) => {
    scrapeInflation(res);
});
app.get("/investment", (req, res) => {
    scrapeInvestments(req, res);
});
app.get("/stocks", (req, res) => {
    scrapeStocks(res);
});
app.get("/news", (req, res) => {
    scrapeNews(res);
});

module.exports = app;
