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
const lib = require('.');
const { map } = require('./commands/utils.js');

const dataDir = path.resolve(root, 'data', argv.data);

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

function exec(prom) {
  prom.then(async (result) => {
    if (result) {
      console.log(result);
    } else {
      console.log('done');
    }

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
    return exec(require('./commands/hashtags.js')(dataDir));
  case 'times':
    return exec(require('./commands/times.js')(dataDir));
  default:
    return console.log('no command found');
}
