# binary-cli-install

binary-cli-install is a tool to install CLIs written in go, rust, c, etc with npm/yarn into a node project.

[![Release](https://img.shields.io/github/release/shkreios/binary-cli-install.svg?style=for-the-badge)](https://github.com/shkreios/binary-cli-install/releases/latest)

[![Software License](https://img.shields.io/badge/license-MIT-brightgreen.svg?style=for-the-badge)](/LICENSE)

[![Build status](https://img.shields.io/github/workflow/status/shkreios/binary-cli-install/build?style=for-the-badge)](https://github.com/shkreios/binary-cli-install/actions?workflow=publish)

# Install

```bash

$ npm install --dev-save binary-cli-install

```

```bash

$ yarn add -D binary-cli-install

```

# How to use it

1. Create a new npm package (needed props: [`version`, `bin`, `binary`])

2. Create a `entrypoint.js` and set as as the bin file in your `package.json`

3. Add a `binary` object to your `package.json` with

- `name` property set to the name of your cli

- `url` property set to the download link

4. Import the Binary class, initialize it and call the run method

# Example

```json
// package.json
{
  "name": "runtime-env",
  "version": "0.0.0",
  "bin": {
    "exmplae": "entrypoint.js"
  },
  "files": ["entrypoint.js"],
  "dependencies": {
    "binary-cli-install": "file:/home/simon/src/binary-cli-install/"
  },
  "binary": {
    "name": "runtime-env",
    "url": "https://github.com/example/example/releases/download/v{{version}}/runtime-env_{{version}}_{{platform}}_{{arch}}.tar.gz"
  }
}
```

```js
// entrypoint.js

// importing both the Binary class and Mapper obejcts specificly for go to map the node arch & platform names to the go names

const {
  Binary,
  GO_ARCH_MAPPING,
  GO_PLATFORM_MAPPING,
} = require("binary-cli-install");

// import your package.json

const { join } = require("path");
const packageJson = require(join("..", "package.json"));

// Pass the mappers and your package.json to the Binary class

const bin = new Binary(
  packageJson,
  GO_ARCH_MAPPING,
  GO_PLATFORM_MAPPING,
  false // set debug to true with info messages should be logged
);

bin.run();
```

# How it works

Your `entrypoint.js` script will be put into the `node_modules/.bin` folder when your package is installed. It acts as a placeholder and will be replaced after the first execution with the binary CLI. To keep a consistent user experience, the js script will call the binary on the first run every run afterwards will just be the binary cli no js wrapper.
