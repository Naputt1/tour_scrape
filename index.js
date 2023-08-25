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
      // waitUntil: "load",
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

  index = 0;
  for (let i = 1; i < 4; i++) {
    while (await mushroomChangePage(i, index)) {
      await wait(WAIT_PER_PAGE);

      const result = await page.evaluate(() => {
        const data = document
          .querySelector(".section-content")
          .querySelector("h1.title").innerText;
        return data.match(/(.+)\s+\((\d+)\)/).slice(1);
      });

      objRef[result[0].replace("ทัวร์", "")] = parseInt(result[1]);
      index++;
    }
  }

  saveAsJson(objRef, filePath);
}

async function mushroomChangePage(temp) {
  return new Promise(async (resolve) => {
    const bRedirected = await page.evaluate(
      (colIndex, index) => {
        const countriesWrapper = document
          .querySelector(".nav-outbound")
          .querySelectorAll(".nav-col")
          [colIndex].querySelectorAll("li");
        if (countriesWrapper.length <= index) {
          return false;
        }
        countriesWrapper[index].querySelector("a").click();
        return true;
      },
      temp,
      mushroomIndex
    );
    mushroomIndex++;
    resolve(bRedirected);
  });
}

async function uniThaiFunc(uniThai, filePath) {
  await redirectPage(page, url[1]);

  while (await unithaiChangePage()) {
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
            uniThai[contry] += result[1];
          } else {
            uniThai[contry] = result[1];
          }
      }
    });
  }

  saveAsJson(uniThai, filePath);
}

let uniThaiRowIndex = 0;
let uniThaiSubIndex = 0;

async function unithaiChangePage() {
  return new Promise(async (resolve) => {
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

        row[rowIndex]
          .querySelectorAll("div.col-sm-12.col-xs-4.col-padl")
          [subIndex].querySelector("a")
          .click();
        return true;
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
    resolve(bRedirected);
  });
}

async function thaiTravelCenterFunc(thaiTravelCenter, filePath) {
  await redirectPage(page, url[2]);

  newurl = await thaiTravelCenterGetNextUrl();

  let secondPage = await browser.newPage();

  while (newurl) {
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

    thaiTravelCenter[courntry] = result;

    newurl = await thaiTravelCenterGetNextUrl();
  }
  await secondPage.close();

  saveAsJson(thaiTravelCenter, filePath);
}

let thaiTravelIndex = 0;

async function thaiTravelCenterGetNextUrl() {
  return new Promise((resolve) => {
    const url = page.evaluate(async (index) => {
      const courntries = document.querySelectorAll(
        "li.outbound-tour.outbound-tour-new"
      );
      if (index >= courntries.length) {
        return false;
      }

      return courntries[index].querySelector("a").getAttribute("href");
    }, thaiTravelIndex);

    thaiTravelIndex++;
    resolve(url);
  });
}

async function nidNoiFunc(nidNoi, filePath) {
  await redirectPage(page, url[3]);

  let country = await nidNoiGetNextUrl();

  while (country) {
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

    nidNoi[country] = num;

    console.log("after");

    country = await nidNoiGetNextUrl();
  }

  saveAsJson(nidNoi, filePath);
}

let nidnoiRowIndex = 0;
let nidNoiIndex = 0;

async function nidNoiGetNextUrl() {
  return new Promise(async (resolve) => {
    let bRedirected = await page.evaluate((rowIndex) => {
      const wrapper = document.querySelector(
        "ul.wow-main-menu__list-menu-1.uk-grid-small.uk-grid"
      ).children[1];
      const row = wrapper.querySelector("ul").children;

      console.log(row.length, rowIndex, row.length <= rowIndex);
      if (row.length <= rowIndex) {
        return false;
      }

      console.log(row[rowIndex], rowIndex);

      const a = row[rowIndex].querySelectorAll("div")[0].querySelector("a");

      console.log("p", row[rowIndex].children);

      console.log("a", a);
      a.click();

      console.log("click");

      return a
        .querySelector("div")
        .innerText.replace("ทัวร์", "")
        .replace(/\s/g, "");
    }, nidNoiIndex);

    console.log("bRedirected", bRedirected, nidNoiIndex);

    if (bRedirected === "ยุโรป") {
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

      bRedirected = data[0];

      if (!bRedirected) {
        await wait(WAIT_PER_PAGE);
        nidNoiIndex++;
        bRedirected = nidNoiGetNextUrl();
      }

      console.log("name", bRedirected);

      await redirectPage(page, data[1]);
    } else if (bRedirected) {
      try {
        await page.waitForSelector(
          "ul.wow-main-menu__list-menu-1.uk-grid-small.uk-grid",
          { timeout: TIME_OUT }
        );
      } catch (e) {}

      console.log("link");

      const link = await page.evaluate((index) => {
        return document
          .querySelector("ul.wow-main-menu__list-menu-1.uk-grid-small.uk-grid")
          .children[1].querySelector("ul")
          .children[index].children[0].querySelector("a")
          .getAttribute("href");
      }, nidNoiIndex);

      console.log(link);
      await redirectPage(page, link);

      console.log("redirec");

      nidNoiIndex++;
    }
    resolve(bRedirected);
  });
}

async function nextTripHolidayFunc(nextTripHoliday, filePath) {
  await redirectPage(page, url[4]);

  let courntry = await nextTripHolidayGetNextUrl();

  while (courntry) {
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

    nextTripHoliday[courntry] = num;

    courntry = await nextTripHolidayGetNextUrl();
  }

  saveAsJson(nextTripHoliday, filePath);
}

let nextTripHolidayRowIndex = 0;
let nextTripHolidaySubIndex = 0;

async function nextTripHolidayGetNextUrl() {
  return new Promise(async (resolve) => {
    let bRedirected = await page.evaluate(
      (rowIndex, subIndex) => {
        const wrapper = document.querySelector(
          "div.wow-main-menu__dropdown-full-width"
        );
        const row = wrapper.querySelector(
          "div.uk-grid-collapse.uk-grid.uk-grid-stack"
        ).children;
        console.log(row.length, rowIndex, row.length - 2 <= rowIndex);
        if (row.length <= rowIndex) {
          return false;
        }

        const a = row[rowIndex].querySelectorAll("a");
        if (a.length <= subIndex) {
          return "next";
        }

        a[subIndex].click();

        return a[subIndex].innerText.replace("ทัวร์", "").replace(/\s/g, "");
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
    }
    resolve(bRedirected);
  });
}

async function tourProFunc(tourPro, filePath) {
  await redirectPage(page, url[5]);

  country = await tourProGetNextUrl();

  while (country) {
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

    if (!num) {
      await wait(40000);
    }

    tourPro[country] = num;

    country = await tourProGetNextUrl();
  }

  saveAsJson(tourPro, filePath);
}

let tourProRowIndex = 0;
let tourProSubIndex = 0;

async function tourProGetNextUrl() {
  return new Promise(async (resolve) => {
    let result = await page.evaluate(
      (rowIndex, subIndex) => {
        const row = document.querySelector(
          "ul.uk-grid-collapse.uk-grid.uk-grid-stack"
        ).children;
        console.log(row.length, rowIndex, row.length - 2 <= rowIndex);
        if (row.length <= rowIndex) {
          return false;
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
      result[0] = await tourProGetNextUrl();
    } else {
      tourProSubIndex++;
      await redirectPage(page, result[1]);
    }
    console.log(result);
    resolve(result[0]);
  });
}

async function getData(filePath, func, objRef) {
  return new Promise(async (resolve) => {
    await fs.access(filePath, fs.constants.F_OK, async (err) => {
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
    await getData("mushroom.json", mushroomFunc, mushroom);

    //unithai
    await getData("uniThai.json", uniThaiFunc, uniThai);

    // thaiTravelCenter
    await getData(
      "thaiTravelCenter.json",
      thaiTravelCenterFunc,
      thaiTravelCenter
    );

    //nidNoi
    await getData("nidNoi.json", nidNoiFunc, nidNoi);

    //nextTripHoliday
    await getData("nextTripHoliday.json", nextTripHolidayFunc, nextTripHoliday);

    //tourPro
    await getData("tourPro.json", tourProFunc, tourPro);

    //organise data
    const data = {};

    function addData(obj, name) {
      Object.keys(obj).forEach((key) => {
        if (data.hasOwnProperty(key)) {
          data[key][name] = obj[key];
        } else {
          data[key] = { [name]: obj[key] };
        }
      });
    }

    function uniThaiaddData(obj, name) {
      Object.keys(obj).forEach((key) => {
        try {
          key = JSON.parse(key);
        } catch (e) {
          if (data.hasOwnProperty(key)) {
            data[key][name] = obj[key];
          } else {
            data[key] = { [name]: obj[key] };
          }
        }
      });
    }

    addData(mushroom, "mushroom");
    uniThaiaddData(uniThai, "uniThai");
    addData(thaiTravelCenter, "thaiTravelCenter");
    addData(nidNoi, "nidNoi");
    addData(nextTripHoliday, "nextTripHoliday");
    addData(tourPro, "tourPro");

    await saveAsJson(data, "temp.json");

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
      const temp = [country];
      const tourobj = data[country];

      for (let i = 1; i < tour[0].length - 1; i++) {
        if (tourobj.hasOwnProperty(tour[0][i])) {
          temp.push(tourobj[tour[0][i]]);
        } else {
          temp.push("#N/A");
        }
      }

      tour.push(temp);
      tour.push([]);
    });

    console.log(tour);

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

    


  } catch (e) {
    console.log(e);
    // await main();
  }
};

main();
