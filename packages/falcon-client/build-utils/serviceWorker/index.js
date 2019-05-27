const Logger = require('@deity/falcon-logger');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');
const rollup = require('rollup');
const resolve = require('rollup-plugin-node-resolve');
const re = require('rollup-plugin-re');
const alias = require('rollup-plugin-alias');
const paths = require('./../paths');
const { getManifestEntries } = require('./workbox');
const { formatBytes } = require('../webpack/tools');

module.exports.build = async () => {
  const isProductionBuild = process.env.NODE_ENV === 'production';

  try {
    const { manifestEntries, size } = await getManifestEntries();
    Logger.log(`Service Worker will pre-cache ${manifestEntries.length} files, totaling ${formatBytes(size)}.\n`);

    const inputOptions = {
      input: fs.existsSync(paths.appSwJs) ? paths.appSwJs : paths.ownSwJs,
      plugins: [
        alias({ 'app-path': paths.appPath }),
        resolve(),
        re({
          patterns: [
            {
              test: 'const ENTRIES = [];',
              replace: `const ENTRIES = ${JSON.stringify(manifestEntries, null, 2)};`
            }
          ]
        })
      ].map(x => x)
    };

    const outputOptions = {
      file: path.join(paths.appPath, path.join('build', 'public', 'sw.js')),
      format: 'iife',
      sourcemap: !isProductionBuild,
      compact: isProductionBuild
    };

    const bundle = await rollup.rollup(inputOptions);
    await bundle.write(outputOptions);
  } catch (error) {
    Logger.error(`${chalk.red('\nFailed to compile.\n')}`);
    Logger.error(error);
    Logger.log();

    process.exit(1);
  }
};
