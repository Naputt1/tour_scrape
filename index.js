const puppeteer = require("puppeteer");
const fs = require("fs");

var browser;
var page;

const WAIT_PER_PAGE = 2000;
const TIME_OUT = 5000;

url = [
  "https://www.mushroomtravel.com/",
  "https://www.unithaitravel.com/th/index.php",
  "https://www.thaitravelcenter.com/th/",
  "https://www.nidnoitravel.com/",
  "https://www.nexttripholiday.com/",
  "https://tourpro.co/",
];

async function redirectPage(page, url) {
  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: TIME_OUT,
    });
  } catch (e) {}
}

async function intervalPromise(func, delay, page) {
  return new Promise((resolve) => {
    const interval = new setInterval(
      async (func) => {
        if (await func(page)) {
          clearInterval(interval);
          resolve();
        }
      },
      delay,
      func,
      page
    );
  });
}

async function saveAsJson(data, filename) {
  data = JSON.stringify(data, null, 2);
  fs.writeFile(filename, data, "utf8", (err) => {
    if (err) {
      console.error("Error writing JSON file:", err);
    } else {
      console.log("JSON data has been written to the file:", filename);
    }
  });
}

function wait(delay) {
  return new Promise(function (resolve) {
    setTimeout(resolve, delay);
  });
}

let mushroomIndex = 0;

async function mushroomFunc(objRef, filePath) {
  await redirectPage(page, url[0]);

  console.log("redirect");

  for (let i = 1; i < 4; i++) {
    let link = await mushroomChangePage(i);
    while (link) {
      try{
        await redirectPage(page, link);
        await wait(WAIT_PER_PAGE);

        const result = await page.evaluate(() => {
          const data = document
            .querySelector(".section-content")
            .querySelector("h1.title").innerText;
          return data.match(/(.+)\s+\((\d+)\)/).slice(1);
        });

        objRef[result[0].replace("ทัวร์", "")] = {"amount":parseInt(result[1]), "link":link};
        link = await mushroomChangePage(i);
      }catch(e){
        console.error(e);
      }
    }
  }

  saveAsJson(objRef, filePath);
}

async function mushroomChangePage(temp) {
  try {
    const bRedirected = await page.evaluate(
      (colIndex, index) => {
        const countriesWrapper = document
          .querySelector(".nav-outbound")
          .querySelectorAll(".nav-col")
          [colIndex].querySelectorAll("li");
        if (countriesWrapper.length <= index) {
          return false;
        }
        return countriesWrapper[index].querySelector("a").getAttribute("href");
      },
      temp,
      mushroomIndex
    );
    mushroomIndex++;
    return bRedirected;
  }catch(e){
    console.error(e);
    await wait(WAIT_PER_PAGE);
    await mushroomChangePage(temp);
  };
}

async function uniThaiFunc(uniThai, filePath) {
  await redirectPage(page, url[1]);

  let link = await unithaiChangePage();

  while (link) {
    try{
    await redirectPage(page, link)
    await wait(WAIT_PER_PAGE);

    try {
      await page.waitForSelector("font.big2.blue");
    } catch (e) {
      const titles2 = document.querySelectorAll("font.sm2.white");
    }

    const results = JSON.parse(
      await page.evaluate(async () => {
        const titles = document.querySelectorAll("font.big2.blue");
        const titles2 = document.querySelectorAll("font.sm2.white");
        const tourWapper = document.querySelectorAll(
          "ul.nospace.group.row.packages-stage.masonry"
        );
        const result = [];
        console.log("dwdw", tourWapper.length, titles.length);

        try {
          let whiteIndex = 0;
          for (let i = 0; i < tourWapper.length; i++) {
            let temp = titles[i].innerText;
            if (!temp) {
              temp = titles2[whiteIndex].innerText;
            }
            const courntries = temp
              .split(" ")
              .map((courntry) => courntry.replace("ทัวร์+แพ็คเกจทัวร์", ""));
            result.push([
              courntries,
              tourWapper[i].querySelectorAll("li").length,
            ]);
          }
        } catch (e) {
          throw new Error(e);
        }

        return JSON.stringify(result);
      })
    );

    results.forEach((result) => {
      const transformedKey = result[0]
        .filter((element) => element !== "")
        .map((element) => element.replace("ทัวร์", "").replace("รวม", ""));

      for (const contry of new Set(transformedKey)) {
        if (contry && contry !== "")
          if (uniThai.hasOwnProperty(contry)) {
            uniThai[contry]["amount"] += result[1];
          } else {
            uniThai[contry] = {"amount":result[1], "link":link};
          }
      }
    });

    link = await unithaiChangePage();
    }catch(e){
      console.error(e)
    }
  }

  saveAsJson(uniThai, filePath);
}

let uniThaiRowIndex = 0;
let uniThaiSubIndex = 0;

async function unithaiChangePage() {
  try {
    let bRedirected = await page.evaluate(
      (rowIndex, subIndex) => {
        const wrapper = document.querySelector(
          "div.col-lg-2.col-sm-3.prl.pll.text-center"
        );
        const row = wrapper.querySelectorAll("div.row");
        console.log(row.length - 2, rowIndex, row.length - 2 <= rowIndex);
        if (row.length - 2 <= rowIndex) {
          return false;
        }

        return "https://www.unithaitravel.com" + row[rowIndex]
          .querySelectorAll("div.col-sm-12.col-xs-4.col-padl")
          [subIndex].querySelector("a").getAttribute("href")
      },
      uniThaiRowIndex,
      uniThaiSubIndex
    );

    if (uniThaiSubIndex >= 2) {
      await wait(WAIT_PER_PAGE);
      uniThaiRowIndex++;
      uniThaiSubIndex = 0;
      bRedirected = await unithaiChangePage();
    } else {
      uniThaiSubIndex++;
    }
    return bRedirected;
  }catch(e){
    console.error(e);
    await wait(WAIT_PER_PAGE);
    return await unithaiChangePage();
  };
}

async function thaiTravelCenterFunc(thaiTravelCenter, filePath) {
  await redirectPage(page, url[2]);

  newurl = await thaiTravelCenterGetNextUrl();

  let secondPage = await browser.newPage();

  try{
  while (newurl) {
    try{
    console.log(newurl);
    await redirectPage(secondPage, newurl);
    await wait(WAIT_PER_PAGE);

    result = [];

    let courntry = "";

    try {
      await secondPage.waitForSelector(
        "p.MuiTypography-root.MuiTypography-body1.MuiTypography-colorTextPrimary"
      );

      courntry = await secondPage.evaluate(() => {
        return document
          .querySelector(
            "p.MuiTypography-root.MuiTypography-body1.MuiTypography-colorTextPrimary"
          )
          .innerHTML.replace("ทัวร์", "")
          .split(" ")[0];
      });
    } catch (e) {
      await secondPage.waitForSelector(
        "div.col-md-6.col-sm-6.col-xs-12.tour-name"
      );

      courntry = await secondPage.evaluate(() => {
        return document
          .querySelector("div.col-md-6.col-sm-6.col-xs-12.tour-name")
          .innerText.replace("แพคเกจทัวร์", "")
          .replace(/\s/g, "");
      });
    }

    try {
      await secondPage.waitForSelector(".Desktopstyle__BoxMain-sc-71ke7o-7", {
        timeout: TIME_OUT,
      });

      await intervalPromise(
        async (page) => {
          return await page.evaluate(() => {
            const btn = document
              .querySelector(".Desktopstyle__BoxMain-sc-71ke7o-7")
              .querySelector(".MuiButtonBase-root");
            if (btn) {
              btn.click();
              return false;
            }

            return true;
          });
        },
        1000,
        secondPage
      );

      console.log("promise");

      result = await secondPage.evaluate(() => {
        return document.querySelectorAll(
          "div.Desktopstyle__BoxTour-sc-71ke7o-8"
        ).length;
      });
    } catch (e) {
      result = await secondPage.evaluate(() => {
        return parseInt(document.querySelector("span.count-tours").innerText);
      });
    }

    thaiTravelCenter[courntry] = {"amount":result, "link":newurl};

    newurl = await thaiTravelCenterGetNextUrl();
    }catch(e){
      console.error(e);
    }
  }}finally{
    await secondPage.close();
  }

  saveAsJson(thaiTravelCenter, filePath);
}

let thaiTravelIndex = 0;

async function thaiTravelCenterGetNextUrl() {
  try{
    const url = await page.evaluate(async (index) => {
      const courntries = document.querySelectorAll(
        "li.outbound-tour.outbound-tour-new"
      );
      if (index >= courntries.length) {
        return false;
      }

      return courntries[index].querySelector("a").getAttribute("href");
    }, thaiTravelIndex);

    thaiTravelIndex++;
    return url;
  }catch(e){
    console.error(e);
    await wait(WAIT_PER_PAGE);
    return thaiTravelCenterGetNextUrl();
  };
}

async function nidNoiFunc(nidNoi, filePath) {
  await redirectPage(page, url[3]);

  let [country, link] = await nidNoiGetNextUrl();

  while (country) {
    try{
    await wait(WAIT_PER_PAGE);

    console.log("next");

    let num = 0;

    try {
      await page.waitForSelector('span[data-wow-attr="tourTotal"]', {
        timeout: TIME_OUT,
      });

      num = await page.evaluate(() => {
        return parseInt(
          document.querySelector('span[data-wow-attr="tourTotal"]').innerText
        );
      });
    } catch (e) {}

    nidNoi[country] = {"amount":num, "link":link};

    console.log("after");

    [country, link] = await nidNoiGetNextUrl();
    }catch(e){
      console.error(e);
    }
  }

  saveAsJson(nidNoi, filePath);
}

let nidnoiRowIndex = 0;
let nidNoiIndex = 0;

async function nidNoiGetNextUrl() {
  try{
    let bRedirected = await page.evaluate((rowIndex) => {
      const wrapper = document.querySelector(
        "ul.wow-main-menu__list-menu-1.uk-grid-small.uk-grid"
      ).children[1];
      const row = wrapper.querySelector("ul").children;

      console.log(row.length, rowIndex, row.length <= rowIndex);
      if (row.length <= rowIndex) {
        return [false, null];
      }

      console.log(row[rowIndex], rowIndex);

      const a = row[rowIndex].querySelectorAll("div")[0].querySelector("a");

      console.log("p", row[rowIndex].children);

      console.log("a", a);

      return [a
        .querySelector("div")
        .innerText.replace("ทัวร์", "")
        .replace(/\s/g, ""), a.getAttribute("href")];
    }, nidNoiIndex);

    await redirectPage(page, bRedirected[1]);

    console.log("bRedirected", bRedirected[0], nidNoiIndex);

    if (bRedirected[0] === "ยุโรป") {
      //get courtry stack courntry name
      const data = await page.evaluate(
        (rowIndex, index) => {
          const row = document
            .querySelector(
              "ul.wow-main-menu__list-menu-1.uk-grid-small.uk-grid"
            )
            .children[1].children[1].querySelector("ul")
            .children[rowIndex].children[1].querySelectorAll("li");

          if (row.length <= index) {
            return [false, undefined];
          }

          console.log(row, row[index], index);

          const a = row[index].querySelector("a");

          return [
            a
              .querySelector("div")
              .innerText.replace("ทัวร์", "")
              .replace(/\s/g, ""),
            a.getAttribute("href"),
          ];
        },
        nidNoiIndex,
        nidnoiRowIndex
      );
      nidnoiRowIndex++;

      bRedirected = data;

      if (!bRedirected[0]) {
        await wait(WAIT_PER_PAGE);
        nidNoiIndex++;
        bRedirected = nidNoiGetNextUrl();
      }

      console.log("name", bRedirected[0]);

      await redirectPage(page, data[1]);
    } else if (bRedirected[0]) {
      try {
        await page.waitForSelector(
          "ul.wow-main-menu__list-menu-1.uk-grid-small.uk-grid",
          { timeout: TIME_OUT }
        );
      } catch (e) {}

      bRedirected[1] = await page.evaluate((index) => {
        return document
          .querySelector("ul.wow-main-menu__list-menu-1.uk-grid-small.uk-grid")
          .children[1].querySelector("ul")
          .children[index].children[0].querySelector("a")
          .getAttribute("href");
      }, nidNoiIndex);

      await redirectPage(page, bRedirected[1]);

      console.log("redirec");

      nidNoiIndex++;
    }
    return bRedirected;
  }catch (e){
    console.error(e);
    await wait(WAIT_PER_PAGE)
    return await nidNoiGetNextUrl();
  };
}

async function nextTripHolidayFunc(nextTripHoliday, filePath) {
  await redirectPage(page, url[4]);

  let [courntry, link] = await nextTripHolidayGetNextUrl();

  while (courntry) {
    try{
    await wait(WAIT_PER_PAGE);

    let num = 0;

    try {
      await page.waitForSelector('span[data-wow-attr="tourTotal"]', {
        timeout: TIME_OUT,
      });

      num = await page.evaluate(() => {
        return parseInt(
          document.querySelector('span[data-wow-attr="tourTotal"]').innerText
        );
      });
    } catch (e) {}

    nextTripHoliday[courntry] = {"amount":num, "link":link};

    [courntry, link] = await nextTripHolidayGetNextUrl();
    }catch(e){
      console.error(e);
    }
  }

  saveAsJson(nextTripHoliday, filePath);
}

let nextTripHolidayRowIndex = 0;
let nextTripHolidaySubIndex = 0;

async function nextTripHolidayGetNextUrl() {
  try{
    let [bRedirected, link] = await page.evaluate(
      (rowIndex, subIndex) => {
        const wrapper = document.querySelector(
          "div.wow-main-menu__dropdown-full-width"
        );
        const row = wrapper.querySelector(
          "div.uk-grid-collapse.uk-grid.uk-grid-stack"
        ).children;
        console.log(row.length, rowIndex, row.length - 2 <= rowIndex);
        if (row.length <= rowIndex) {
          return [false, null];
        }

        const a = row[rowIndex].querySelectorAll("a");
        console.log(a.length, subIndex, a.length <= subIndex);
        if (a.length <= subIndex) {
          return ["next", null];
        }

        return [a[subIndex].innerText.replace("ทัวร์", "").replace(/\s/g, ""), a[subIndex].getAttribute("href")];
      },
      nextTripHolidayRowIndex,
      nextTripHolidaySubIndex
    );

    if (bRedirected === "next") {
      await wait(WAIT_PER_PAGE);
      nextTripHolidayRowIndex++;
      nextTripHolidaySubIndex = 0;
      bRedirected = nextTripHolidayGetNextUrl();
    } else {
      nextTripHolidaySubIndex++;
      await redirectPage(page, link)
    }
    return [bRedirected, link];
  }catch (e){
    console.error(e);
    await wait(WAIT_PER_PAGE);
    return await nextTripHolidayGetNextUrl();
  };
}

async function tourProFunc(tourPro, filePath) {
  await redirectPage(page, url[5]);

  let [country, link] = await tourProGetNextUrl();

  while (country) {
    try{
    await wait(WAIT_PER_PAGE);

    let num = 0;

    try {
      await page.waitForSelector('span[data-wow-attr="tourTotal"]', {
        timeout: TIME_OUT,
      });

      num = await page.evaluate(() => {
        return parseInt(
          document.querySelector('span[data-wow-attr="tourTotal"]').innerText
        );
      });
    } catch (e) {}

    tourPro[country] = {"amount":num, "link":link};

    [country, link] = await tourProGetNextUrl();
    }catch(e){
      console.error(e);
    }
  }

  saveAsJson(tourPro, filePath);
}

let tourProRowIndex = 0;
let tourProSubIndex = 0;

async function tourProGetNextUrl() {
  try{
    let result = await page.evaluate(
      (rowIndex, subIndex) => {
        const row = document.querySelector(
          "ul.uk-grid-collapse.uk-grid.uk-grid-stack"
        ).children;
        console.log(row.length, rowIndex, row.length - 2 <= rowIndex);
        if (row.length <= rowIndex) {
          return [false, null];
        }

        console.log("courntries");

        const courntries = row[rowIndex].querySelector(
          "div.uk-grid-collapse.uk-grid.uk-grid-stack"
        ).children;
        if (courntries.length <= subIndex) {
          return ["next"];
        }

        const a = courntries[subIndex].querySelector("a");

        return [
          a.getAttribute("title").replace("ทัวร์", "").replace(/\s/g, ""),
          a.getAttribute("href"),
        ];
      },
      tourProRowIndex,
      tourProSubIndex
    );

    if (result[0] === "next") {
      await wait(WAIT_PER_PAGE);
      tourProRowIndex++;
      tourProSubIndex = 0;
      result = await tourProGetNextUrl();
    } else {
      tourProSubIndex++;
      await redirectPage(page, result[1]);
    }
    console.log(result);
    return result;
  }catch(e){
    console.error(e);
    await wait(WAIT_PER_PAGE);
    return await tourProGetNextUrl();
  }  
}

async function getData(filePath, func, objRef) {
  return new Promise(async (resolve) => {
    fs.access(filePath, fs.constants.F_OK, async (err) => {
      if (err) {
        await func(objRef, filePath);
        console.log(filePath, objRef);
        resolve();
      } else {
        // File exists, read the file
        fs.readFile(filePath, "utf8", (err, data) => {
          if (err) {
            console.error("Error reading file:", err);
          } else {
            Object.assign(objRef, JSON.parse(data));
            console.log("File content:", data);
            resolve();
          }
        });
      }
    });
  });
}

// uk-grid-collapse uk-grid uk-grid-stack

const mushroom = {};
const uniThai = {};
const thaiTravelCenter = {};
const nidNoi = {};
const nextTripHoliday = {};
const tourPro = {};

const main = async () => {
  try {
    browser = await puppeteer.launch({
      headless: false,
    });
    page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36"
    );

    page.setDefaultNavigationTimeout(TIME_OUT);

    //mushroom
    await getData("cache/mushroom.json", mushroomFunc, mushroom);

    //unithai
    await getData("cache/uniThai.json", uniThaiFunc, uniThai);

    // thaiTravelCenter
    await getData(
      "cache/thaiTravelCenter.json",
      thaiTravelCenterFunc,
      thaiTravelCenter
    );

    //nidNoi
    await getData("cache/nidNoi.json", nidNoiFunc, nidNoi);

    //nextTripHoliday
    await getData(
      "cache/nextTripHoliday.json",
      nextTripHolidayFunc,
      nextTripHoliday
    );

    //tourPro
    await getData("cache/tourPro.json", tourProFunc, tourPro);

    //organise data
    const data = {};

    function addData(obj, name) {
      Object.keys(obj).forEach((key) => {
        if (data.hasOwnProperty(key)){
          data[key][name] = obj[key];
        } else{
          data[key] = { [name]: obj[key] };
        }
      });
    }


    addData(mushroom, "mushroom");
    addData(uniThai, "uniThai");
    addData(thaiTravelCenter, "thaiTravelCenter");
    addData(nidNoi, "nidNoi");
    addData(nextTripHoliday, "nextTripHoliday");
    addData(tourPro, "tourPro");

    await saveAsJson(data, "temp.json");

    // console.log(data);


    const tour = [
      [
        "ประเทศ",
        "mushroom",
        "uniThai",
        "thaiTravelCenter",
        "nidNoi",
        "nextTripHoliday",
        "tourPro",
      ],
    ];

    Object.keys(data).forEach(country => {
      const temp = [""];
      const links = [country];
      const tourobj = data[country];

      for (let i = 1; i < tour[0].length; i++) {
        if (tourobj.hasOwnProperty(tour[0][i])) {
          temp.push(tourobj[tour[0][i]]["amount"]);
          links.push(tourobj[tour[0][i]]["link"]);
        } else {
          temp.push("#N/A");
          links.push("");
        }
      }

      tour.push(links);
      tour.push(temp);
      tour.push([]);
    });

    // console.log(tour);

    await saveAsJson(tour, "output.json");

    fs.writeFile(
      "output.csv",
      tour.map((row) => row.join(",")).join("\n").toString(),
      "utf8",
      (err) => {
        if (err) {
          console.error("Error writing CSV file:", err);
        } else {
          console.log("CSV file written successfully");
        }
      }
    );

    
    browser.close();

  } catch (e) {
    console.log(e);
    await page.close();
    await browser.close();
    await main();
  }
};

main();
