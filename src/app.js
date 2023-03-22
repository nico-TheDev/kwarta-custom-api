const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const puppeteer = require("puppeteer");

require("dotenv").config();

const middlewares = require("./middlewares");
const api = require("./api");

const app = express();

app.use(morgan("dev"));
app.use(helmet());
app.use(cors());
app.use(express.json());

async function run() {
    // Launch the browser
    const browser = await puppeteer.launch();

    // Create a page
    const page = await browser.newPage();

    // Go to your site
    await page.goto("https://tradingeconomics.com/philippines/inflation-cpi");

    const data = await page.evaluate(() =>
        Array.from(document.querySelectorAll("#calendar .an-estimate-row"), (e) => ({
            date: e.querySelector("td:first-child").innerText,
            month: e.querySelector("td:nth-child(4)").innerText,
            rate: e.querySelector("td:nth-child(5)").innerText,
        }))
    );
    // Close browser.
    await browser.close();

    return data;
}

app.get("/", async (req, res) => {
    try {
        const data = await run();
        console.log("DATA", data);
        res.json({
            message: "Success",
            data,
            source: "Philippine Statistics Authority",
        });
    } catch (err) {
        res.json({
            message: "Error",
            error: err,
        });
    }
});

app.use("/api/v1", api);

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

module.exports = app;
