const { PlaywrightCrawler } = require("crawlee");

const TIMEZONES = [
  "ACDT",
  "ACST",
  "ACT",
  "ACWST",
  "ADT",
  "AEDT",
  "AEST",
  "AET",
  "AFT",
  "AKDT",
  "AKST",
  "ALMT",
  "AMST",
  "AMT",
  "ANAST",
  "ANAT",
  "AQTT",
  "ART",
  "AST",
  "AT",
  "AWDT",
  "AWST",
  "AZOST",
  "AZST",
  "AZT",
  "AoE",
  "BNT",
  "BOT",
  "BRST",
  "BRT",
  "BST",
  "BTT",
  "CAST",
  "CAT",
  "CCT",
  "CDT",
  "CEST",
  "CET",
  "CHADT",
  "CHAST",
  "CHOST",
  "CHOT",
  "CHUT",
  "CIDST",
  "CIST",
  "CKT",
  "CLST",
  "CLT",
  "COT",
  "CST",
  "CT",
  "CVT",
  "CXT",
  "ChST",
  "DAVT",
  "DDUT",
  "EASST",
  "EAST",
  "EAT",
  "ECT",
  "EDT",
  "EEST",
  "EET",
  "EGST",
  "EGT",
  "EST",
  "ET",
  "FET",
  "FJST",
  "FJT",
  "FKST",
  "FKT",
  "FNT",
  "GALT",
  "GAMT",
  "GET",
  "GFT",
  "GILT",
  "GMT",
  "GST",
  "GYT",
  "HDT",
  "HKT",
  "HOVST",
  "HOVT",
  "HST",
  "ICT",
  "IDT",
  "IOT",
  "IRDT",
  "IRKST",
  "IRKT",
  "IRST",
  "IST",
  "JST",
  "KGT",
  "KOST",
  "KRAST",
  "KRAT",
  "KST",
  "KUYT",
  "LHDT",
  "LHST",
  "LINT",
  "MAGST",
  "MAGT",
  "MART",
  "MAWT",
  "MDT",
  "MHT",
  "MMT",
  "MSD",
  "MSK",
  "MST",
  "MT",
  "MUT",
  "MVT",
  "MYT",
  "NCT",
  "NDT",
  "NFDT",
  "NFT",
  "NOVST",
  "NOVT",
  "NPT",
  "NRT",
  "NST",
  "NUT",
  "NZDT",
  "NZST",
  "OMSST",
  "OMST",
  "ORAT",
  "PDT",
  "PET",
  "PETST",
  "PETT",
  "PGT",
  "PHOT",
  "PHT",
  "PKT",
  "PMDT",
  "PMST",
  "PONT",
  "PST",
  "PT",
  "PWT",
  "PYST",
  "PYT",
  "QYZT",
  "RET",
  "ROTT",
  "SAKT",
  "SAMT",
  "SAST",
  "SBT",
  "SCT",
  "SGT",
  "SRET",
  "SRT",
  "SST",
  "SYOT",
  "TAHT",
  "TFT",
  "TJT",
  "TKT",
  "TLT",
  "TMT",
  "TOST",
  "TOT",
  "TRT",
  "TVT",
  "ULAST",
  "ULAT",
  "UTC",
  "UYST",
  "UYT",
  "UZT",
  "VET",
  "VLAST",
  "VLAT",
  "VOST",
  "VUT",
  "WAKT",
  "WARST",
  "WAST",
  "WAT",
  "WEST",
  "WET",
  "WFT",
  "WGST",
  "WGT",
  "WIB",
  "WIT",
  "WITA",
  "WST",
  "WT",
  "YAKST",
  "YAKT",
  "YAPT",
  "YEKST",
  "YEKT",
];
const ONE_LETTER_TIMEZONES = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
];
const MONTHS = new Map([
  ["Jan", 1],
  ["Feb", 2],
  ["Mar", 3],
  ["Apr", 4],
  ["May", 5],
  ["Jun", 6],
  ["Jul", 7],
  ["Aug", 8],
  ["Sept", 9],
  ["Sep", 9],
  ["Oct", 10],
  ["Nov", 11],
  ["Dec", 12],
]);
const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MOJIBAKE_THIN_SPACE = "\u00e2\u20ac\u2030";
const MOJIBAKE_EN_DASH = "\u00e2\u20ac\u201c";
const UNICODE_EN_DASH = "\u2013";

const DEFAULT_CONFIG = Object.freeze({
  requestHandlerTimeoutSecs: 220,
  navigationTimeoutSecs: 45,
  maxRequestRetries: 1,
  maxEventsPerQuery: 80,
  maxScrollSteps: 36,
  scrollStepPx: 1200,
  scrollWaitMs: 250,
  scrollMaxDurationMs: 25000,
  launchOptions: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-blink-features=AutomationControlled",
    ],
  },
});

const toFiniteNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildConfig = (config = {}) => {
  const incomingLaunchOptions = config.launchOptions || {};
  return {
    requestHandlerTimeoutSecs: toFiniteNumber(
      config.requestHandlerTimeoutSecs,
      DEFAULT_CONFIG.requestHandlerTimeoutSecs,
    ),
    navigationTimeoutSecs: toFiniteNumber(
      config.navigationTimeoutSecs,
      DEFAULT_CONFIG.navigationTimeoutSecs,
    ),
    maxRequestRetries: Math.max(
      0,
      Math.floor(
        toFiniteNumber(config.maxRequestRetries, DEFAULT_CONFIG.maxRequestRetries),
      ),
    ),
    maxEventsPerQuery: Math.max(
      1,
      Math.floor(
        toFiniteNumber(config.maxEventsPerQuery, DEFAULT_CONFIG.maxEventsPerQuery),
      ),
    ),
    maxScrollSteps: Math.max(
      1,
      Math.floor(toFiniteNumber(config.maxScrollSteps, DEFAULT_CONFIG.maxScrollSteps)),
    ),
    scrollStepPx: Math.max(
      100,
      Math.floor(toFiniteNumber(config.scrollStepPx, DEFAULT_CONFIG.scrollStepPx)),
    ),
    scrollWaitMs: Math.max(
      50,
      Math.floor(toFiniteNumber(config.scrollWaitMs, DEFAULT_CONFIG.scrollWaitMs)),
    ),
    scrollMaxDurationMs: Math.max(
      1000,
      Math.floor(
        toFiniteNumber(
          config.scrollMaxDurationMs,
          DEFAULT_CONFIG.scrollMaxDurationMs,
        ),
      ),
    ),
    launchOptions: {
      ...DEFAULT_CONFIG.launchOptions,
      ...incomingLaunchOptions,
      args:
        Array.isArray(incomingLaunchOptions.args) &&
        incomingLaunchOptions.args.length > 0
          ? incomingLaunchOptions.args
          : DEFAULT_CONFIG.launchOptions.args,
    },
  };
};

const removeChar = (str, char, first) => {
  let value = String(str || "");
  let index = value.length - 1;
  let start = 0;
  let end = -1;

  if (first) {
    index = 0;
    start = 1;
    end = value.length;
  }

  if (value.charAt(index) === char) {
    value = value.slice(start, end);
  }
  return value;
};

const removeSpaces = (str) => {
  let value = String(str || "");
  value = value.replace(/\u2009/g, " ");
  value = value.replace(new RegExp(MOJIBAKE_THIN_SPACE, "g"), " ");
  value = removeChar(value, " ");
  value = removeChar(value, " ", true);
  return value;
};

const getTime = (str) => {
  const value = String(str || "");
  const timeRegex = new RegExp(/([0-9])\d:([0-9])\d/);
  let hour = -1;
  let min = -1;
  const regResult = timeRegex.exec(value);
  let output = value;

  if (regResult !== null) {
    output = output.slice(0, -regResult[0].length);
    output = removeSpaces(output);
    const split = regResult[0].split(":");
    hour = Number(split[0]);
    min = Number(split[1]);
  }

  return { hour, min, str: output };
};

const getDay = (str) => {
  let value = String(str || "");
  let day = -1;
  const dayRegex = new RegExp(/([0-9]){1,2}/);
  const regResult = dayRegex.exec(value);

  if (regResult !== null) {
    day = Number(regResult[0]);
    if (regResult.index === 0) {
      value = value.slice(regResult[0].length, value.length);
    } else {
      value = value.slice(0, -regResult[0].length);
    }
    value = removeSpaces(value);
  }

  return { day, str: value };
};

const removeWeekDays = (str) => {
  let value = String(str || "");
  for (const day of WEEK_DAYS) {
    if (value.includes(day)) {
      value = value.slice(day.length);
      value = removeSpaces(value);
    }
  }
  return value;
};

const checkIfValid = (start, end, numericFallback) => {
  let startVal = start;
  let endVal = end;
  if (startVal === -1 && endVal !== -1) {
    startVal = endVal;
  } else if (startVal !== -1 && endVal === -1) {
    endVal = startVal;
  } else if (startVal === -1 && endVal === -1) {
    startVal = numericFallback ? numericFallback : 0;
    endVal = numericFallback ? numericFallback : 0;
  }
  return { start: startVal, end: endVal };
};

const splitDateRange = (value) => {
  if (!value) return [""];
  if (value.includes(MOJIBAKE_EN_DASH)) return value.split(MOJIBAKE_EN_DASH);
  if (value.includes(` ${UNICODE_EN_DASH} `)) {
    return value.split(` ${UNICODE_EN_DASH} `);
  }
  if (value.includes(" - ")) return value.split(" - ");
  return [value];
};

const toUnixUtc = (year, month, day, hour, min) => {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return 0;
  }
  const unix = Date.UTC(
    year,
    Math.max(0, month - 1),
    Math.max(1, day),
    Math.max(0, hour),
    Math.max(0, min),
  );
  return Math.floor(unix / 1000);
};

const parseDateRange = (rawDateText) => {
  const dateObj = new Date();
  let dateString = removeSpaces(rawDateText || "");
  let timezone = "";

  for (const zone of TIMEZONES) {
    if (dateString.includes(zone)) {
      timezone = dateString.substring(dateString.indexOf(zone));
      dateString = dateString.slice(0, -timezone.length);
      break;
    }
  }

  for (const zone of ONE_LETTER_TIMEZONES) {
    const trimmed = dateString.trim();
    if (trimmed.charAt(trimmed.length - 1) === zone) {
      timezone = trimmed.substring(trimmed.indexOf(zone));
      dateString = trimmed.slice(0, -timezone.length);
      break;
    }
  }

  dateString = removeSpaces(dateString);
  let splitString = splitDateRange(dateString);

  let startHour = -1;
  let startMin = -1;
  let startDay = -1;
  let startMonth = -1;

  splitString[0] = removeSpaces(splitString[0]);
  let timeRes = getTime(splitString[0]);
  startHour = timeRes.hour;
  startMin = timeRes.min;
  splitString[0] = removeChar(timeRes.str, ",");

  let splitDate = splitString[0].split(",");
  for (let i = 0; i < splitDate.length; i += 1) {
    splitDate[i] = removeSpaces(splitDate[i]);
  }

  const yearRegex = new RegExp(/([0-9]){4}/);
  let startDate = splitDate[splitDate.length - 1];
  let year = dateObj.getFullYear();
  let regResult = yearRegex.exec(startDate);

  if (regResult !== null) {
    year = Number(regResult[0]);
    startDate = startDate.slice(0, -year.toString().length);
    startDate = removeSpaces(startDate);
  }

  const startDateParts = startDate.split(" ");
  const guessedMonth = MONTHS.get(startDateParts[1]);
  if (
    Number.isFinite(guessedMonth) &&
    (guessedMonth < dateObj.getMonth() + 1 ||
      (guessedMonth === dateObj.getMonth() + 1 &&
        Number(startDateParts[0]) < dateObj.getDate()))
  ) {
    year = dateObj.getFullYear() + 1;
  }

  startDate = removeWeekDays(startDate);
  let dayRes = getDay(startDate);
  startDay = dayRes.day;
  startDate = dayRes.str;
  startMonth = MONTHS.get(startDate) === undefined ? -1 : MONTHS.get(startDate);

  let endHour = -1;
  let endMin = -1;
  let endDay = -1;
  let endMonth = -1;

  if (splitString.length === 2) {
    splitString[1] = removeSpaces(splitString[1]);
    timeRes = getTime(splitString[1]);
    endHour = timeRes.hour;
    endMin = timeRes.min;
    splitString[1] = removeChar(timeRes.str, ",");
    splitDate = splitString[1].split(",");

    for (let i = 0; i < splitDate.length; i += 1) {
      splitDate[i] = removeSpaces(splitDate[i]);
    }

    let endDate = splitDate[splitDate.length - 1];
    regResult = yearRegex.exec(endDate);

    if (regResult !== null) {
      endDate = endDate.slice(0, -year.toString().length);
      endDate = removeSpaces(endDate);
    }

    endDate = removeWeekDays(endDate);
    dayRes = getDay(endDate);
    endDay = dayRes.day;
    endDate = dayRes.str;
    endMonth = MONTHS.get(endDate) === undefined ? -1 : MONTHS.get(endDate);
  }

  let finalStartDate = 0;
  let finalEndDate = 0;

  if (splitString.length === 2) {
    let checkRes = checkIfValid(startHour, endHour);
    startHour = checkRes.start;
    endHour = checkRes.end;

    checkRes = checkIfValid(startMin, endMin);
    startMin = checkRes.start;
    endMin = checkRes.end;

    checkRes = checkIfValid(startDay, endDay, 1);
    startDay = checkRes.start;
    endDay = checkRes.end;

    checkRes = checkIfValid(startMonth, endMonth, 1);
    startMonth = checkRes.start;
    endMonth = checkRes.end;

    finalStartDate = toUnixUtc(year, startMonth, startDay, startHour, startMin);
    finalEndDate = toUnixUtc(year, endMonth, endDay, endHour, endMin);
  } else {
    if (startHour === -1) startHour = 0;
    if (startMin === -1) startMin = 0;
    if (startDay === -1) startDay = 1;
    if (startMonth === -1) startMonth = 1;
    finalStartDate = toUnixUtc(year, startMonth, startDay, startHour, startMin);
  }

  return {
    start: finalStartDate,
    end: finalEndDate,
    timezone,
  };
};

const getDateChip = (options) => {
  if (options?.today) return "&htichips=date:today";
  if (options?.tomorrow) return "&htichips=date:tomorrow";
  if (options?.thisWeek) return "&htichips=date:week";
  if (options?.thisWeekend) return "&htichips=date:weekend";
  if (options?.nextWeek) return "&htichips=date:next_week";
  if (options?.nextMonth) return "&htichips=date:next_month";
  return "";
};

const safeText = async (locator) => {
  try {
    if ((await locator.count()) <= 0) return "";
    const value = await locator.textContent({ timeout: 4000 });
    return String(value || "").trim();
  } catch (error) {
    return "";
  }
};

const safeAttr = async (locator, attr) => {
  try {
    if ((await locator.count()) <= 0) return "";
    const value = await locator.getAttribute(attr, { timeout: 4000 });
    return String(value || "").trim();
  } catch (error) {
    return "";
  }
};

const scrollEventsContainer = async (page, container, config) => {
  const startedAt = Date.now();
  let stableCycles = 0;

  for (let i = 0; i < config.maxScrollSteps; i += 1) {
    if (Date.now() - startedAt > config.scrollMaxDurationMs) break;

    const scrollState = await container
      .evaluate(
        (el, step) => {
          const before = el.scrollTop;
          const maxScrollTop = Math.max(0, el.scrollHeight - el.clientHeight);
          el.scrollBy(0, step);
          return {
            before,
            after: el.scrollTop,
            maxScrollTop,
          };
        },
        config.scrollStepPx,
      )
      .catch(() => null);

    await page.waitForTimeout(config.scrollWaitMs);

    if (!scrollState) continue;
    const moved = Math.abs(scrollState.after - scrollState.before) > 1;
    const nearBottom = scrollState.maxScrollTop - scrollState.after <= 4;

    if (!moved || nearBottom) {
      stableCycles += 1;
    } else {
      stableCycles = 0;
    }

    if (stableCycles >= 3) break;
  }
};

const scrapeEvent = async (page, eventLocator) => {
  if (!(await eventLocator.isVisible().catch(() => false))) {
    return null;
  }

  await eventLocator.click({ timeout: 5000 }).catch(() => null);
  const id = await eventLocator.getAttribute("data-encoded-docid").catch(() => "");
  if (!id) return null;

  const event = page.locator(`div[data-encoded-docid="${id}"]`).first();
  const description = await safeText(event.locator(".PVlUWc").first());
  const imageUrl = await safeAttr(
    event.locator('div[jsname="HiaYvf"]').first().locator("img[src]"),
    "src",
  );

  const mapImagePath = await safeAttr(
    event.locator('div[jsname="i4ewOd"]').first().locator("img[src]"),
    "src",
  );
  const mapImageUrl = mapImagePath ? `https://google.com${mapImagePath}` : "";

  const dateRaw = await safeText(event.locator(".Gkoz3").first());
  const parsedDate = parseDateRange(dateRaw);
  const whenText = await safeText(event.locator(".yZX6Sd").first());

  const lineOne = await safeText(event.locator(".n3VjZe").first());
  const lineTwo = await safeText(event.locator(".U6txu").first());
  const mapPath = await safeAttr(event.locator(".ozQmAd").first(), "data-url");
  const mapUrl = mapPath ? `https://google.com${mapPath}` : "";

  const links = [];
  const linkLocators = await event
    .locator('div[jsname="CzizI"]')
    .first()
    .locator(".SKIyM")
    .all();

  for (const linkLocator of linkLocators) {
    links.push({
      name: await safeText(linkLocator.locator(".NLMF7b span").first()),
      url: await safeAttr(linkLocator, "href"),
    });
  }

  return {
    name: await safeText(event.locator('div[jsname="r4nke"]').first()),
    description,
    imageUrl,
    mapImageUrl,
    date: {
      start: parsedDate.start,
      end: parsedDate.end,
      timezone: parsedDate.timezone,
      when: whenText,
    },
    location: {
      name: lineTwo === "" ? "" : lineOne,
      address: lineTwo === "" ? lineOne : lineTwo,
      mapUrl,
    },
    links,
  };
};

class GoogleEventsScraper {
  constructor(config) {
    this.data = [];
    this.config = buildConfig(config);
  }

  async Scrape(query, options) {
    const normalizedQuery = String(query || "")
      .trim()
      .split(/\s+/)
      .join("+");
    const when = getDateChip(options);
    const allResults = [];

    const crawler = new PlaywrightCrawler({
      launchContext: {
        launchOptions: this.config.launchOptions,
      },
      navigationTimeoutSecs: this.config.navigationTimeoutSecs,
      requestHandlerTimeoutSecs: this.config.requestHandlerTimeoutSecs,
      maxRequestRetries: this.config.maxRequestRetries,
      maxRequestsPerCrawl: 1,
      preNavigationHooks: [
        async ({ page }) => {
          await page.context().addCookies([
            {
              name: "CONSENT",
              value: "YES+",
              domain: "www.google.com",
              path: "/",
            },
          ]);
        },
      ],
      requestHandler: async ({ page }) => {
        const eventsContainer = page.locator('div[jsname="CaV2mb"]').first();
        await eventsContainer.waitFor({ state: "visible", timeout: 20000 });

        const box = await eventsContainer.boundingBox();
        if (box) {
          await page.mouse
            .move(box.x + box.width / 2, box.y + box.height / 2)
            .catch(() => null);
        }

        await scrollEventsContainer(page, eventsContainer, this.config);

        const events = await page.locator(".voohof li").all();
        const limitedEvents = events.slice(0, this.config.maxEventsPerQuery);

        for (const event of limitedEvents) {
          const parsed = await scrapeEvent(page, event);
          if (parsed) allResults.push(parsed);
        }
      },
    });

    await crawler.run([
      `https://www.google.com/search?q=${encodeURI(normalizedQuery)}&ibp=htl;events#htivrt=events${when}`,
    ]);

    this.data = allResults;
    return allResults;
  }

  GetResults() {
    return this.data;
  }
}

module.exports = GoogleEventsScraper;
