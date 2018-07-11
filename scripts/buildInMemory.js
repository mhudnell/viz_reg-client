'use strict';

// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = 'production';
process.env.NODE_ENV = 'production';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err;
});

// Ensure environment variables are read.
require('../config/env');

const webpack = require('webpack');
const MemoryFS = require('memory-fs'),
      memfs = new MemoryFS();
const express = require('express'),
      app = express();
const paths = require('../config/paths');
const config = require('../config/webpack.config.prod');
const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages');
const mime = require('mime');

// let compiler = webpack(config);
// compiler.outputFileSystem = memfs;
// // compiler.resolvers.normal.fileSystem = memfs;
// // compiler.resolvers.context.fileSystem = memfs;
// compiler.run(function(err, stats) {
//   console.log("COMPILED");
//   if (err) throw err;

//   // console.log(stats.compilation.assets);
//   // console.log(stats.compilation.assets[paths.appIndexJs].source());
// });

// Create the production build and print the deployment instructions.
function buildInMem() {
  console.log('Creating a production build in memory...');
  memfs.mkdirpSync(paths.appBuild);

  let compiler = webpack(config);
  compiler.outputFileSystem = memfs;
  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) {
        return reject(err);
      }
      const messages = formatWebpackMessages(stats.toJson({}, true));
      if (messages.errors.length) {
        // Only keep the first error. Others are often indicative
        // of the same problem, but confuse the reader with noise.
        if (messages.errors.length > 1) {
          messages.errors.length = 1;
        }
        return reject(new Error(messages.errors.join('\n\n')));
      }
      if (
        process.env.CI &&
        (typeof process.env.CI !== 'string' ||
          process.env.CI.toLowerCase() !== 'false') &&
        messages.warnings.length
      ) {
        console.log(
          chalk.yellow(
            '\nTreating warnings as errors because process.env.CI = true.\n' +
              'Most CI servers set it automatically.\n'
          )
        );
        return reject(new Error(messages.warnings.join('\n\n')));
      }
      return resolve({
        stats,
        warnings: messages.warnings,
      });
    });
  });
}

// this will go in a different file at some point
buildInMem().then( () => {
  //===== server from directory for testing
  // app.use(express.static('/Users/mhudnell/dev/viz_reg/client/build'));
  // app.get('*', function (req, res) {
  //   res.sendFile('/Users/mhudnell/dev/viz_reg/client/build/index.html');
  // });

  let staticJson = JSON.parse(memfs.readFileSync(paths.appBuild + "/asset-manifest.json").toString());
  let staticList = [];
  for(var key in staticJson) {
    staticList.push("/" + staticJson[key]);
  }

  app.get('*', function(req, res) {
    // console.log(req.originalUrl + " | " + mime.getType(req.originalUrl));

    // can't use express' app.use() to serve static files with 'memory-fs', so must serve them individually
    // check to see if the requested url is a static file, serve the correct file if so
    if(staticList.includes(req.originalUrl)){
      res.set("Content-Type", mime.getType(req.originalUrl));
      res.send(memfs.readFileSync(paths.appBuild + req.originalUrl));
    } else {
      res.set("Content-Type", "text/html");
      res.send(memfs.readFileSync(paths.appBuild + "/index.html"));
    }
  });

  let server = app.listen(4000);
  console.log("SERVING WITH EXPRESS");
})
