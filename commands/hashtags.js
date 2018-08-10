/* eslint-disable no-console */

const fancyTable = require('fancy-text-table');
const chalk = require('chalk');

const { bold, readAllData, mean } = require('./utils.js');

module.exports = async function hashtags(dataDir) {
  const data = await readAllData(dataDir);

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

  return table.render();
};
