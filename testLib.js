const tsConfigPaths = require('tsconfig-paths');
const tsConfig = require('./tsconfig.json');

tsConfigPaths.register({
  baseUrl: tsConfig.compilerOptions.baseUrl || './',
  paths: tsConfig.compilerOptions.paths || {}
});

require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'commonjs' }
});

const { fetchChampionData } = require('./src/main/data/lolalytics');
fetchChampionData('Akali', 'middle', '14.8').then(console.log).catch(console.error);
