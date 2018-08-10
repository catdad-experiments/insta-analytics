/* eslint-disable no-console, indent */

const path = require('path');

const argv = require('yargs')
.option('command', { type: 'string' })
.option('username', { type: 'string' })
.option('count', { type: 'number', default: 12 })
.options('data', { type: 'string', default: 'data/posts' })
.argv;

const root = require('rootrequire');
const fs = require('fs-extra');
const fancyTable = require('fancy-text-table');
const chalk = require('chalk');
const lib = require('.');

const dataDir = path.resolve(root, 'data', argv.data);

function mean(...args) {
  return args.reduce((a, b) => a + b) / args.length;
}

function bold(arr) {
  return arr.map(i => chalk.bold(i));
}

async function map(arr, func) {
  let newArr = [];

  for (let i in arr) {
    newArr[i] = await func(arr[i], i, arr);
  }

  return newArr;
}

function getMaxLikes(...posts) {
  return posts.reduce((memo, post) => {
    return post.likes > memo ? post.likes : memo;
  }, 0);
}

async function getPostObj(post) {
  return Object.assign({ post }, await lib.getStats(post));
}

async function updatePosts(username, count) {
  await fs.mkdirp(dataDir);

  const posts = await lib.getPosts(username, count);

  await map(posts, async post => {
    await fs.writeFile(
      path.resolve(dataDir, `${post}.json`),
      JSON.stringify(await getPostObj(post), null, 2)
    );
  });
}

async function readAllData() {
  return await map(await fs.readdir(dataDir), async file => {
    return JSON.parse(await fs.readFile(path.resolve(dataDir, file), 'utf8'));
  });
}

async function hashtagStats() {
  const data = await readAllData();

  const hashtags = data.reduce((memo, item) => {
    item.hashtags.forEach(tag => {
      memo[tag] = memo[tag] || [];
      memo[tag].push(item.likes);
    });

    return memo;
  }, {});

  const table = fancyTable();
  const headings = bold(['hashtag', 'average likes', 'posts', 'rank']);

  table.row(headings);
  table.line();

  Object.keys(hashtags).map(tag => {
    const likes = Math.round(mean(...hashtags[tag]));
    const posts = hashtags[tag].length;

    return {
      tag,
      likes,
      posts,
      rank: Math.round(likes + (likes * posts * 0.1))
    };
  }).sort((a, b) => {
    // highest rank at the end, so that it can be
    // read easily in terminal
    return a.rank - b.rank || a.likes - b.likes;
  }).forEach(rank => {
    table.row([
      chalk.gray(rank.tag),
      rank.likes,
      rank.posts > 5 ? chalk.bold.green(rank.posts) : chalk.gray(rank.posts),
      rank.rank
    ]);
  });

  table.line();
  table.row(headings);

  console.log(table.render());
}

function Arr(size) {
  return Array.apply(null, Array(size)).map(() => {});
}

function createDailyTable(posts, maxLikes, day) {
  const rows = 6;
  const one = chalk.yellow('⚫');
  const zero = chalk.blue('.');

  const table = fancyTable();
  const headings = bold([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  table.title(chalk.cyan(day));
  table.row(headings);

  const hours = posts.reduce((memo, post) => {
    const date = new Date(post.datetime);
    const hour = date.getHours();
    memo[hour] = memo[hour] || [];

    memo[hour].push(post);

    return memo;
  }, []).map(hour => {
    const likes = Math.round(mean(...hour.map(p => p.likes)));
    const ticks = Math.round(likes / maxLikes * rows);

    return {
      likes: likes,
      ticks: Arr(rows).map((i, idx) => idx > ticks ? zero : one).reverse()
    };
  });

  Arr(rows).forEach((n, i) => {
    const row = headings.map(function (n, j) {
      return hours[j] ? hours[j].ticks[i] : zero;
    });

    table.row(row);
  });

  table.title(Arr(75).map(() => '-').join(''));

  return table.render();
}

async function times() {
  const names = {
    // Sunday - Saturday : 0 - 6
    '0': 'Sunday',
    '1': 'Monday',
    '2': 'Tuesday',
    '3': 'Wednesday',
    '4': 'Thursday',
    '5': 'Friday',
    '6': 'Saturday',
  };

  const data = await readAllData();
  const maxLikes = getMaxLikes(...data);

  const table = fancyTable();
  const headings = bold(['day', 'posts', 'avg. likes']);

  table.row(headings);

  data.reduce((memo, post) => {
    const date = new Date(post.datetime);
    const day = date.getDay();

    memo[day].push(post);
    return memo;
  }, [[], [], [], [], [], [], []]).map((day, idx) => {
    return {
      day: names[idx],
      count: day.length,
      avgLikes: Math.round(mean(...day.map(d => d.likes))),
      posts: day,
      dailyTable: createDailyTable(day, maxLikes, names[idx])
    };
  }).forEach(summary => {
    table.row([
      summary.day,
      summary.count,
      summary.avgLikes
    ]);

    console.log(summary.dailyTable, '\n');
  });

  table.line();

  console.log(table.render());
}

function exec(prom) {
  prom.then(async () => {
    console.log('done');
    await lib.done();
  }).catch(async err => {
    console.error(err);
    process.exitCode = 1;
    await lib.done();
  });
}

switch (argv.command) {
  case 'posts':
    return exec(updatePosts(argv.username, argv.count));
  case 'hashtags':
    return exec(hashtagStats());
  case 'times':
    return exec(times());
  default:
    return console.log('no command found');
}
