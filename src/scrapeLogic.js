const puppeteer = require("puppeteer");

const options = {
    args: [
        "--disable-setuid-sandbox",
        "--no-sandbox",
        "--single-process",
        "--no-zygote",
        "--disable-web-security",
        "--disable-features=IsolateOrigins",
        "--disable-site-isolation-trials",
    ],
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
                prevRate: e.querySelector("td:nth-child(6)").innerText,
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
    const browser = await puppeteer.launch({ ...options });
    try {
        // Create a page
        const page = await browser.newPage();

        // Go to your site
        await page.goto("https://ph.investing.com/news/most-popular-news", {
            timeout: 0,
            waitUntil: "load",
        });

        await page.waitForSelector("div.largeTitle .articleItem");

        const newsList = await page.evaluate(() =>
            Array.from(document.querySelectorAll(".largeTitle .articleItem"), (e) => {
                return {
                    title: e.querySelector(".textDiv a.title").getAttribute("title"),
                    link:
                        "https://ph.investing.com" +
                        e.querySelector(".textDiv a.title").getAttribute("href"),
                    image: e.querySelector("a.img img").getAttribute("src"),
                    // details: e.querySelector(".textDiv span.articleDetails .date").textContent,
                    // summary: e.querySelector(".textDiv p").innerHTML,
                };
            })
        );

        // Close browser.
        res.status(300).json({
            newsList: newsList.slice(0, 8),
        });
    } catch (err) {
        console.error(err);
        res.send(`Something Went Wrong:${err}`);
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

        await page.waitForSelector("div.chartPopWrap  .marketChart");

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
        // Close browser.
        res.status(300).json({
            trendingStocks,
            marketMovers,
        });
    } catch (err) {
        console.error(err);
        res.send(`Something Went Wrong:${err}`);
    } finally {
        await browser.close();
    }
}

async function answerForms(res, name, email) {
    const schoolNames = [
        "PUP",
        "Polytechnic University of the Philippines",
        "URS",
        "NCBA",
        "Siena",
        "  ",
        "   ",
    ];
    const delayList = [100, 200, 300, 400, 500, 600];
    function getRandomString(array) {
        if (!Array.isArray(array) || array.length === 0) {
            return null; // Return null if the input is not a valid array or if it's an empty array
        }

        const randomIndex = Math.floor(Math.random() * array.length); // Generate a random index within the array length
        return array[randomIndex]; // Return the random string at the generated index
    }

    // Launch the browser
    const browser = await puppeteer.launch({ ...options, headless: true });
    try {
        // Create a page
        const page = await browser.newPage();

        // Go to your site
        await page.goto(
            "https://docs.google.com/forms/d/e/1FAIpQLSfVrVRwppK5Uu2WyezlqKHRyrF-61XZ0dIwopOKMMixa0djbw/viewform?usp=sf_link",
            {
                waitUntil: "load",
            }
        );

        await page.type(
            "#mG61Hd > div.RH5hzf.RLS9Fe > div > div.o3Dpx > div:nth-child(1) > div > div > div.AgroKb > div > div.aCsJod.oJeWuf > div > div.Xb9hP > input",
            name,
            { delay: getRandomString(delayList) }
        );
        await page.type(
            "#mG61Hd > div.RH5hzf.RLS9Fe > div > div.o3Dpx > div:nth-child(2) > div > div > div.AgroKb > div > div.aCsJod.oJeWuf > div > div.Xb9hP > input",
            email,
            { delay: getRandomString(delayList) }
        );
        await page.type(
            "#mG61Hd > div.RH5hzf.RLS9Fe > div > div.o3Dpx > div:nth-child(3) > div > div > div.AgroKb > div > div.aCsJod.oJeWuf > div > div.Xb9hP > input",
            getRandomString(schoolNames),
            { delay: getRandomString(delayList) }
        );

        await page.click(
            "#mG61Hd > div.RH5hzf.RLS9Fe > div > div.ThHDze > div.DE3NNc.CekdCb > div.lRwqcd > div",
            { delay: getRandomString(delayList) }
        );

        await page.waitForSelector(
            "#mG61Hd > div.RH5hzf.RLS9Fe > div > div.o3Dpx > div:nth-child(2) > div > div > div.PY6Xd > div > span > div > label:nth-child(6) > div.eRqjfd > div > div"
        );

        const buttonList = await page.$$(`#mG61Hd div > [data-value='5'] div.vd3tt`);
        await page.click(
            "#mG61Hd > div.RH5hzf.RLS9Fe > div > div.o3Dpx > div:nth-child(2) > div > div > div.PY6Xd > div > span > div > label:nth-child(6) > div.eRqjfd > div > div",
            { delay: getRandomString(delayList) }
        );
        console.log(buttonList);
        for (let i = 0; i < buttonList.length; i += 1) {
            await buttonList[i].click({ delay: getRandomString(delayList) });
        }

        await page.click(
            "#mG61Hd > div.RH5hzf.RLS9Fe > div > div.ThHDze > div.DE3NNc.CekdCb > div.lRwqcd > div.uArJ5e.UQuaGc.Y5sE8d.VkkpIf.QvWxOd",
            { delay: getRandomString(delayList) }
        );

        await page.waitForSelector(
            "body > div.Uc2NEf > div:nth-child(2) > div.RH5hzf.RLS9Fe > div > div.vHW8K"
        );
        await page.close();
        await browser.close();

        // Close browser.
    } catch (err) {
        console.error(err);
        res.send(`Something Went Wrong:${err}`);
    } finally {
        // await browser.close();
    }
}

async function answerPostTest(res, name) {
    const delayList = [100, 200, 300, 400, 500, 600];
    const chanceCounter = [4, 4, 4, 4, 4, 4, 4, 3, 3, 2];
    function getRandomString(array) {
        if (!Array.isArray(array) || array.length === 0) {
            return null; // Return null if the input is not a valid array or if it's an empty array
        }

        const randomIndex = Math.floor(Math.random() * array.length); // Generate a random index within the array length
        return array[randomIndex]; // Return the random string at the generated index
    }

    // Launch the browser
    const browser = await puppeteer.launch({ ...options, headless: true });
    try {
        // Create a page
        const page = await browser.newPage();

        // Go to your site
        await page.goto("https://forms.gle/J8qAr4T7zMGrr2Du8", {
            waitUntil: "load",
        });

        await page.click("#i6", { delay: getRandomString(delayList) });

        await page.click(
            "#mG61Hd > div.RH5hzf.RLS9Fe > div > div.ThHDze > div.DE3NNc.CekdCb > div.lRwqcd > div",
            { delay: getRandomString(delayList) }
        );

        await page.waitForSelector(
            `#mG61Hd div > [data-value='Strongly Agree / Lubos na sumasang-ayon'] div.vd3tt`
        );

        const fourButtonList = await page.$$(
            `#mG61Hd div > [data-value='Strongly Agree / Lubos na sumasang-ayon'] div.vd3tt`
        );
        const threeButtonList = await page.$$(
            `#mG61Hd div > [data-value='Agree  / Sumasang-ayon'] div.vd3tt`
        );
        const twoButtonList = await page.$$(
            `#mG61Hd div > [data-value='Disagree / Hindi sumasang-ayon'] div.vd3tt`
        );

        console.log(fourButtonList);
        for (let i = 0; i < fourButtonList.length; i += 1) {
            const randomNum = getRandomString(chanceCounter);

            if (randomNum == 4) {
                await fourButtonList[i].click({ delay: getRandomString(delayList) });
            } else if (randomNum == 2) {
                await twoButtonList[i].click({ delay: getRandomString(delayList) });
            } else if (randomNum == 3) {
                await threeButtonList[i].click({ delay: getRandomString(delayList) });
            }
        }

        await page.type(
            "#mG61Hd > div.RH5hzf.RLS9Fe > div > div.o3Dpx > div:nth-child(2) > div > div > div.AgroKb > div > div.aCsJod.oJeWuf > div > div.Xb9hP input",
            name,
            { delay: 200 }
        );

        await page.click(
            "#mG61Hd > div.RH5hzf.RLS9Fe > div > div.ThHDze > div.DE3NNc.CekdCb > div.lRwqcd > div:last-child",
            { delay: getRandomString(delayList) }
        );

        await page.waitForSelector(
            "#mG61Hd div > [data-value='Strongly Agree / Lubos na sumasang-ayon'] div.vd3tt"
        );

        const fourBtnTechList = await page.$$(
            `#mG61Hd div > [data-value='Strongly Agree / Lubos na sumasang-ayon'] div.vd3tt`
        );
        const threeBtnTechList = await page.$$(
            `#mG61Hd div > [data-value='Agree  / Sumasang-ayon'] div.vd3tt`
        );

        const chanceCounterTech = [4, 4, 4, 4, 4, 4, 4, 3, 3, 3];

        for (let i = 0; i < fourBtnTechList.length; i += 1) {
            const randomNum = getRandomString(chanceCounterTech);

            if (randomNum == 4) {
                await fourBtnTechList[i].click({ delay: getRandomString(delayList) });
            } else if (randomNum == 3) {
                await threeBtnTechList[i].click({ delay: getRandomString(delayList) });
            }
        }

        const randomComments = [
            `Your software application for monitoring finances is incredibly user-friendly, making it easy for anyone to navigate and manage their finances effectively.`,
            `Expand the software's compatibility by developing mobile applications for both iOS and Android platforms, enabling users to access their financial information on the go.`,
            `Implement automated bill payment reminders and alerts to help users stay on top of their financial obligations and avoid late fees.`,
            `Offer financial education resources, such as articles, videos, or webinars, within the software to help users improve their financial literacy and make more informed financial decisions.`,
            "N/A",
            "N/A",
            "N/A",
            "N/A",
            "N/A",
            "N/A",
            "N/A",
            "N/A",
            "Good job ! Smooth Experience.",
            "Good job ! Smooth Experience.",
            "Good job ! Smooth Experience.",
        ];

        await page.type(
            "#mG61Hd > div.RH5hzf.RLS9Fe > div > div.o3Dpx > div:nth-child(7) > div > div > div.AgroKb > div > div.RpC4Ne.oJeWuf > div.Pc9Gce.Wic03c > textarea",
            getRandomString(randomComments)
        );

        await page.click(
            "#mG61Hd > div.RH5hzf.RLS9Fe > div > div.ThHDze > div.DE3NNc.CekdCb > div.lRwqcd > div.uArJ5e.UQuaGc.Y5sE8d.VkkpIf.QvWxOd",
            { delay: getRandomString(delayList) }
        );
        setTimeout(async () => {
            await page.close();
            await browser.close();
        }, 3000);

        // Close browser.
    } catch (err) {
        console.error(err);
        res.send(`Something Went Wrong:${err}`);
    } finally {
        // await browser.close();
    }
}
async function answerPreTest(res, name) {
    const delayList = [100, 200, 300, 400, 500, 600];
    const chanceCounter = [1, 1, 1, 1, 2, 2, 2, 2, 3, 3];
    function getRandomString(array) {
        if (!Array.isArray(array) || array.length === 0) {
            return null; // Return null if the input is not a valid array or if it's an empty array
        }

        const randomIndex = Math.floor(Math.random() * array.length); // Generate a random index within the array length
        return array[randomIndex]; // Return the random string at the generated index
    }

    // Launch the browser
    const browser = await puppeteer.launch({ ...options, headless: true });
    try {
        // Create a page
        const page = await browser.newPage();

        // Go to your site
        await page.goto(
            "https://docs.google.com/forms/d/e/1FAIpQLSeqVR9NBvOYBqC9_6xXYAz-j1GlkwwDZNN_Ut_j7bbzw6k8Nw/viewform",
            {
                waitUntil: "load",
            }
        );

        await page.click("#i6", { delay: getRandomString(delayList) });

        await page.click(
            "#mG61Hd > div.RH5hzf.RLS9Fe > div > div.ThHDze > div.DE3NNc.CekdCb > div.lRwqcd > div",
            { delay: getRandomString(delayList) }
        );

        await page.waitForSelector(
            "#mG61Hd div > [data-value='Strongly Disagree / Lubos na hindi sumasang-ayon'] div.vd3tt"
        );

        const oneButtonList = await page.$$(
            `#mG61Hd div > [data-value='Strongly Disagree / Lubos na hindi sumasang-ayon'] div.vd3tt`
        );
        const twoButtonList = await page.$$(
            `#mG61Hd div > [data-value='Disagree / Hindi sumasang-ayon'] div.vd3tt`
        );
        const threeButtonList = await page.$$(
            `#mG61Hd div > [data-value='Agree  / Sumasang-ayon'] div.vd3tt`
        );

        console.log(oneButtonList);
        for (let i = 0; i < oneButtonList.length; i += 1) {
            const randomNum = getRandomString(chanceCounter);

            if (randomNum == 1) {
                await oneButtonList[i].click({ delay: getRandomString(delayList) });
            } else if (randomNum == 2) {
                await twoButtonList[i].click({ delay: getRandomString(delayList) });
            } else if (randomNum == 3) {
                await threeButtonList[i].click({ delay: getRandomString(delayList) });
            }
        }

        await page.type(
            "#mG61Hd > div.RH5hzf.RLS9Fe > div > div.o3Dpx > div:nth-child(2) > div > div > div.AgroKb > div > div.aCsJod.oJeWuf > div > div.Xb9hP input",
            name,
            { delay: 200 }
        );

        await page.click(
            "#mG61Hd > div.RH5hzf.RLS9Fe > div > div.ThHDze > div.DE3NNc.CekdCb > div.lRwqcd > div.uArJ5e.UQuaGc.Y5sE8d.VkkpIf.QvWxOd",
            { delay: getRandomString(delayList) }
        );

        setTimeout(async () => {
            await page.close();
            await browser.close();
        }, 3000);

        // Close browser.
    } catch (err) {
        console.error(err);
        res.send(`Something Went Wrong:${err}`);
    } finally {
        // await browser.close();
    }
}

module.exports = {
    scrapeInflation,
    scrapeInvestments,
    scrapeNews,
    scrapeStocks,
    answerForms,
    answerPreTest,
    answerPostTest,
};
