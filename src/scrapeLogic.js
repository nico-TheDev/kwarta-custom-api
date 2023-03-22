const puppeteer = require("puppeteer");

async function scrapeLogic(res) {
    // Launch the browser
    const browser = await puppeteer.launch({
        args: ["--disable-setuid-sandbox", "--no-sandbox", "--single-process", "--no-zygote"],
        executablePath:
            process.env.NODE_ENV === "production"
                ? process.env.PUPPETEER_EXECUTABLE_PATH
                : puppeteer.executablePath(),
    });
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

module.exports = { scrapeLogic };
