const puppeteer = require("puppeteer");

const options = {
    args: ["--disable-setuid-sandbox", "--no-sandbox", "--single-process", "--no-zygote"],
    executablePath:
        process.env.NODE_ENV === "production"
            ? process.env.PUPPETEER_EXECUTABLE_PATH
            : puppeteer.executablePath(),
};

async function scrapeInflation(res) {
    // Launch the browser
    const browser = await puppeteer.launch(options);
    try {
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
        res.status(300).json({
            message: "Inflation Rate in the Philippines",
            data,
            source: "Philippine Statistics Authority",
        });
    } catch (err) {
        console.error(err);
        res.send(`Something Went Wrong:${err}`);
    } finally {
        await browser.close();
    }
}

async function scrapeNews(res) {
    // Launch the browser
    const browser = await puppeteer.launch(options);
    try {
        // Create a page
        const page = await browser.newPage();

        // Go to your site
        await page.goto("https://ph.investing.com/news/most-popular-news", {
            waitUntil: "load",
            timeout: 0,
        });

        const newsList = await page.evaluate(() =>
            Array.from(document.querySelectorAll("div.largeTitle .articleItem"), (e) => {
                return {
                    title: e.querySelector(".textDiv a.title").textContent,
                    link:
                        "https://ph.investing.com" +
                        e.querySelector(".textDiv a.title").getAttribute("href"),
                    image: e.querySelector("a.img img").getAttribute("src"),
                    details: e.querySelector("span.articleDetails .date").textContent,
                    summary: e.querySelector(".textDiv p").textContent,
                };
            })
        );

        // Close browser.
        res.status(300).json({
            newsList: newsList.slice(0, 8),
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err });
    } finally {
        await browser.close();
    }
}

async function scrapeInvestments(req, res) {
    // Launch the browser
    const browser = await puppeteer.launch(options);
    try {
        const { initialDeposit, period, subsequentDeposit, targetYear } = req.query;
        // Create a page
        const page = await browser.newPage();

        // Go to your site
        await page.goto("https://online.sunlife.com.ph/cdt/eCalcAge/investmentCalculator", {
            waitUntil: "load",
            timeout: 0,
        });

        // TYPE INTO THE INPUTS

        await page.type('pierce/input[name="initialDeposit"]', initialDeposit);
        await page.select('pierce/select[name="period"]', period);
        await page.type('pierce/input[name="subsequentDeposit"]', subsequentDeposit);
        await page.select('pierce/select[name="year"]', targetYear);

        const resultBtn = await page.waitForSelector("pierce/.cal-result-btn button");
        await resultBtn.click();
        await page.waitForSelector("pierce/.totat-investment");

        // GENERATE THE RESULT

        // total investment
        const totalInvestmentNode = await page.$("pierce/.totat-investment .amount");
        const totalInvestment = await page.evaluate((div) => div.textContent, totalInvestmentNode);
        const dataNode = await page.$("pierce/.projected-value ul");
        const finalData = await page.evaluate(
            (e) => {
                return {
                    savingsAccount: e.querySelector("li:first-child .amount").innerText,
                    timeDeposit: e.querySelector("li:nth-child(2) .amount").innerText,
                    lowRiskFund: e.querySelector("li:nth-child(3) .amount").innerText,
                    moderateRiskFund: e.querySelector("li:nth-child(4) .amount").innerText,
                    aggressiveRiskFund: e.querySelector("li:nth-child(5) .amount").innerText,
                };
            },

            dataNode
        );

        // await page.screenshot({ type: 'png', fullPage: true, path: 'sample.png' });
        // Close browser.
        res.status(201).json({
            data: {
                totalInvestment,
                ...finalData,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err });
    } finally {
        await browser.close();
    }
}

async function scrapeStocks(res) {
    // Launch the browser
    const browser = await puppeteer.launch(options);
    try {
        // Create a page
        const page = await browser.newPage();

        // Go to your site
        await page.goto("https://ph.investing.com/equities/trending-stocks", {
            waitUntil: "load",
            timeout: 0,
        });

        const trendingStocks = await page.evaluate(() =>
            Array.from(document.querySelectorAll("div.chartPopWrap  .marketChart"), (e) => {
                return {
                    id: e.parentElement.getAttribute("id"),
                    company: e.querySelector("a:first-child").textContent,
                    link: "https://ph.investing.com" + e.querySelector("a").getAttribute("href"),
                    price: e.querySelector("a:first-child + div :first-child").textContent,
                    priceIncrease: e.querySelector("a:first-child + div :nth-child(2)").textContent,
                    pricePercentage: e.querySelector("a:first-child + div :nth-child(3)")
                        .textContent,
                };
            })
        );

        const marketMovers = await page.evaluate(() =>
            Array.from(document.querySelectorAll("table#MM_table1 tbody tr"), (e) => {
                return {
                    company: e.querySelector("td:nth-child(2) a").textContent,
                    link: "https://ph.investing.com" + e.querySelector("a").getAttribute("href"),
                    price: e.querySelector("td:nth-child(3)").textContent,
                    pricePercentage: e.querySelector("td:nth-child(4)").textContent,
                    volume: e.querySelector("td:nth-child(5)").textContent,
                };
            })
        );

        await page.goto("https://edge.pse.com.ph/");

        const indexSummary = await page.evaluate(() =>
            Array.from(
                document.querySelectorAll(".index > table:nth-child(2) > tbody:nth-child(3) > tr"),
                (e) => {
                    return {
                        label: e.querySelector("td.label").textContent,
                        price: e.querySelector("td:nth-child(2)").textContent,
                        priceChange: e.querySelector("td:nth-child(3)").textContent.trim(),
                        pricePercentage: e.querySelector("td:nth-child(4)").textContent.trim(),
                    };
                }
            )
        );

        // Close browser.
        res.status(300).json({
            trendingStocks,
            marketMovers,
            indexSummary,
            // topDivStocks
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err });
    } finally {
        await browser.close();
    }
}

module.exports = { scrapeInflation, scrapeInvestments, scrapeNews, scrapeStocks };
