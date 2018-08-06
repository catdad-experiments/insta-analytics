const puppeteer = require('puppeteer');

let open = false;

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
  open = true;

  return await puppeteer.launch({
    headless: false
  });
});

const getPage = cache(async function () {
  const browser = await getBrowser();
  return await browser.newPage();
});

async function scrollAndLoad(page) {
  const eventPromise = new Promise(resolve => {
    let openReqs = 0;
    let doneTimer;

    function onReq() {
      clearTimeout(doneTimer);

      openReqs += 1;
    }

    function onRes() {
      openReqs -= 1;

      if (openReqs < 1) {
        onZero();
      }
    }

    function onZero() {
      if (doneTimer) {
        clearTimeout(doneTimer);
      }

      doneTimer = setTimeout(() => {
        page.removeListener('request', onReq);
        page.removeListener('response', onRes);

        resolve();
      }, 500);
    }

    page.on('request', onReq);
    page.on('response', onRes);

    doneTimer = setTimeout(() => onZero(), 1000);
  });

  const pagePromise = page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });

  await Promise.all([eventPromise, pagePromise]);
}

async function goto(url) {
  const page = await getPage();
  await page.goto(url);

  return page;
}

async function getPosts(username, count = 12) {
  const page = await goto(`https://www.instagram.com/${username}/`);
  let postCount = null;
  let uniquePosts = new Set();

  async function getPostsRecursive() {
    const posts = await page.evaluate(() => {
      const elems = document.querySelectorAll('[href*="/p/"]');
      const links = [].slice.call(elems).map(el => el.href);
      return links;
    });

    posts.map(p => {
      return p.match(/\/p\/([^/]+)/)[1];
    }).forEach(p => uniquePosts.add(p));

    if (postCount === null) {
      postCount = uniquePosts.size;
    } else if (postCount === uniquePosts.size) {
      // there are no more posts, so return the ones
      // we have even if they are less
      return;
    }

    postCount = uniquePosts.size;

    if (postCount < count) {
      await scrollAndLoad(page);
      return await getPostsRecursive();
    }
  }

  await getPostsRecursive();

  return Array.from(uniquePosts).slice(0, count);
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
  if (!open) {
    return;
  }

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
