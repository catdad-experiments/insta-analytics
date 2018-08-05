/* eslint-disable no-console, indent */

const path = require('path');

const argv = require('yargs')
.option('command', { type: 'string' })
.option('username', { type: 'string' })
.argv;

const root = require('rootrequire');
const fs = require('fs-extra');
const lib = require('.');

const dataDir = path.resolve(root, 'data/posts');

function mean(...args) {
  return args.reduce((a, b) => a + b) / args.length;
}

async function map(arr, func) {
  let newArr = [];

  for (let i in arr) {
    newArr[i] = await func(arr[i], i, arr);
  }

  return newArr;
}

async function getPostObj(post) {
  return Object.assign({ post }, await lib.getStats(post));
}

async function updatePosts(username) {
  await fs.mkdirp(dataDir);

  const posts = await lib.getPosts(username);

  await map(posts, async post => {
    await fs.writeFile(
      path.resolve(root, `data/posts/${post}.json`),
      JSON.stringify(await getPostObj(post), null, 2)
    );
  });
}

async function hashtagStats() {
  const files = await fs.readdir(dataDir);

  const data = await map(files, async file => {
    return JSON.parse(await fs.readFile(path.resolve(dataDir, file), 'utf8'));
  });

  const hashtags = data.reduce((memo, item) => {
    item.hashtags.forEach(tag => {
      memo[tag] = memo[tag] || [];
      memo[tag].push(item.likes);
    });

    return memo;
  }, {});

  Object.keys(hashtags).map(tag => {
    return {
      hashtag: tag,
      likes: Math.round(mean(...hashtags[tag])),
      posts: hashtags[tag].length
    };
  }).sort((a, b) => {
    return a.likes - b.likes;
  }).forEach(rank => {
    console.log(rank.hashtag, rank.likes, rank.posts);
  });
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
    return exec(updatePosts(argv.username));
  case 'hashtags':
    return exec(hashtagStats());
  default:
    return console.log('no command found');
}
