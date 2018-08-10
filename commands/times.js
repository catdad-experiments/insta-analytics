const fancyTable = require('fancy-text-table');
const chalk = require('chalk');

const { readAllData, bold, mean, Arr } = require('./utils.js');

function getMaxLikes(...posts) {
  return posts.reduce((memo, post) => {
    return post.likes > memo ? post.likes : memo;
  }, 0);
}

function createDailyTable(posts, maxLikes, day) {
  const rows = 6;
  const one = chalk.magenta('█');
  const zero = chalk.grey('·');

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

module.exports = async function times(dataDir) {
  const data = await readAllData(dataDir);
  const maxLikes = getMaxLikes(...data);

  let result = '';
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

    result += summary.dailyTable + '\n\n';
  });

  return result + '\n' + table.render();
};
