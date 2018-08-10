const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');

function Arr(size) {
  return Array.apply(null, Array(size)).map(() => {});
}

function bold(arr) {
  return arr.map(i => chalk.bold(i));
}

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

async function readAllData(dataDir) {
  return await map(await fs.readdir(dataDir), async file => {
    return JSON.parse(await fs.readFile(path.resolve(dataDir, file), 'utf8'));
  });
}

module.exports = {
  Arr,
  mean,
  readAllData,
  map,
  bold
};
