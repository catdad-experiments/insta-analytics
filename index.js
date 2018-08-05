const puppeteer = require('puppeteer');

const cache = function (func) {
  let val;

  return async function(...args) {
    if (val) {
      return val;
    }

    val = await func(...args);

    return val;
  };
};

const getBrowser = cache(async function () {
  return await puppeteer.launch({
    headless: false
  });
});

const getPage = cache(async function () {
  const browser = await getBrowser();
  return await browser.newPage();
});

async function goto(url) {
  const page = await getPage();
  await page.goto(url);

  return page;
}

async function getPosts(username) {
  const page = await goto(`https://www.instagram.com/${username}/`);

  const posts = await page.evaluate(() => {
    const elems = document.querySelectorAll('[href*="/p/"]');
    const links = [].slice.call(elems).map(el => el.href);
    return links;
  });

  const ids = posts.map(p => {
    return p.match(/\/p\/([^/]+)/)[1];
  });

  return ids;
}

async function getStats(post) {
  const link = `https://www.instagram.com/p/${post}/`;
  const page = await goto(link);

  const likes = await page.$$eval('[role=button]', els => els.filter(el => /[0-9]+ likes/.test(el.innerText)).map(el => el.innerText)[0]);
  const hashtags = await page.$$eval('[href*="/explore/tags"]', els => els.map(el => el.innerText));
  const datetime = await page.$eval('[datetime]', el => el.getAttribute('datetime'));

  return {
    post,
    link,
    likes: Number(likes.match(/^([0-9]+)/)[1]),
    hashtags,
    datetime
  };
}

async function done() {
  const browser = await getBrowser();
  await browser.close();
}

module.exports = {
  getBrowser,
  goto,
  getPosts,
  getStats,
  done
};
