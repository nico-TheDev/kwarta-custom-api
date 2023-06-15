const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const {
    scrapeInflation,
    scrapeInvestments,
    scrapeNews,
    scrapeStocks,
    answerForms,
    answerPreTest,
    answerPostTest,
} = require("./scrapeLogic");

const datalist = require("../names.json");

require("dotenv").config();

const app = express();

app.use(morgan("dev"));
app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("WELCOME TO CASH API!");
});

// app.get("/posttest", (req, res) => {
//     // const nameList = datalist.slice(120, 136);
//     const nameList = datalist.slice(95, 100);

//     nameList.forEach((item) => {
//         // console.log(item);
//         answerPostTest(res, item.Column4);
//     });
// });

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
