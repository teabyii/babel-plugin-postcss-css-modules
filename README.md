# Babel CSS Modules by PostCSS

[![NPM version][npm-badge]][npm-url]
[![Build status][travis-badge]][travis-url]
[![Coverage Status][coverage-badge]][coverage-url]
[![JavaScript Style Guide][standard-badge]][standard-url]
[![Commitizen Friendly][commitizen-badge]][commitizen-url]

Babel Plugin to enjoy css module & process CSS file via [PostCSS](postcss)

```js
import styles from './styles';
```

```css
.example { color: cyan; }
```

Into an object that has properties mirroring the style names:

```js
var styles = {"example": "_example_amfqe_1"};
```

Forked from: [babel-plugin-transform-postcss][transform-postcss] 

And Why: https://github.com/wbyoung/babel-plugin-transform-postcss/issues/89  

Yes, I need to keep `import/require` declaration in some case when I make public components on npm which is used in project with [create-react-app][create-react-app]. Thanks to [babel-plugin-transform-postcss][transform-postcss].

## Usage

Install the transform as well as `postcss` and any PostCSS plugins you want to use:

```bash
npm install --save-dev \
  babel-plugin-postcss-css-modules \
  postcss \
  postcss-modules
```

Add the transform to your babel configuration, i.e. `.babelrc`:

```json
{
  "presets": [
    ["env", { "targets": { "node": "current" }}]
  ],
  "plugins": [
    "postcss-css-modules"
  ]
}
```

Create a [`postcss.config.js`][postcss-load-config]:

```js
module.exports = (ctx) => ({
  plugins: [
    require('postcss-modules')({
      getJSON: ctx.extractModules || (() => {}),
    }),
  ],
});
```

You can also specify a location to load your `postcss.config.js` from in the options in your Babel configuration, i.e. `.babelrc`:
```json
{
  "plugins": [
    ["postcss-css-modules", {
      "config": "configuration/postcss.config.js",
      "keep": true,
      "from": "./src",
      "to": "./dist",
    }]
  ]
}
```

Use `"keep": true` to keep `import/require` declaration. `from & to` should be given when need to output css file, they can be absolute path or relative path with `root` (default to `process.cwd()`).

By default we look for `.css` files, but you can also specify the extensions we should look for:
```json
{
  "plugins": [
    ["postcss-css-modules", {
      "config": "configuration/postcss.config.js",
      "extensions": [".scss"]
    }]
  ]
}
```

## Details

The transform will transform all imports & require statements that have a `.css` extension and run them through `postcss`. To determine the PostCSS config, it uses [`postcss-load-config`][postcss-load-config] with [additional context values](#postcss-load-config-context). One of those config values, [`extractModules`](#extractmodules_-any-modules-object) should be invoked in order to define the value of the resulting import.

No CSS is actually included in the resulting JavaScript. 

I recommend to use `"keep": true` in this plugin's options to keep `import/requre` declaration that your webpack can also bundle css file easily. However, webpack also should handle css file transform with the same `postcss.config.js`.

> Notes: Without webpack, when you just use babel-cli with this plugin, you should set form & to options to make sure css file output.

Without `"keep": true`, It is expected that you transform your CSS using the same `postcss.config.js` file as the one used by this transform.

Finally, it's worth noting that this transform also adds a comment to the generated code indicating the related CSS file so that it can be processed by other tools, i.e. [`relateify`][relateify].

### PostCSS Load Config Context

#### `extractModules(_: any, modules: object)`

This option is a function that may be passed directly on to [`postcss-modules`][postcss-modules] as the [`getJSON` argument][postcss-modules-get-json]. Other uses, while unlikely, are permittable, as well.

The function accepts two arguments. The transform uses only the second value passed to the function. That value is the object value that replaces the `import`/`require`.

## Cache

This module caches the results of the compilation of CSS files and stores the cache in a directory under `/tmp/bppcm-UNIQUE_ID`. The cache is only invalidated when the CSS file contents change and not when the `postcss.config.js` file changes (due to limitations at the time of implementation). Try removing the cache if you're not seeing expected changes.

## License

This project is distributed under the MIT license.

[postcss]: http://postcss.org/
[postcss-cli]: https://github.com/postcss/postcss-cli
[postcss-modules]: https://github.com/css-modules/postcss-modules
[postcss-modules-get-json]: https://github.com/css-modules/postcss-modules#saving-exported-classes
[postcss-load-config]: https://github.com/michael-ciniawsky/postcss-load-config
[relateify]: https://github.com/wbyoung/relateify
[webpack]: http://webpack.js.org

[npm-url]: https://npmjs.org/package/babel-plugin-postcss-css-modules
[npm-badge]: http://img.shields.io/npm/v/babel-plugin-postcss-css-modules.svg?style=flat
[travis-url]: https://travis-ci.org/teabyii/babel-plugin-postcss-css-modules
[travis-badge]: http://img.shields.io/travis/teabyii/babel-plugin-postcss-css-modules.svg?style=flat
[coverage-url]: https://coveralls.io/github/teabyii/babel-plugin-postcss-css-modules
[coverage-badge]: http://img.shields.io/coveralls/teabyii/babel-plugin-postcss-css-modules.svg?style=flat
[standard-url]: https://standardjs.com
[standard-badge]: https://img.shields.io/badge/code_style-standard-brightgreen.svg?style=flat
[commitizen-url]: http://commitizen.github.io/cz-cli/
[commitizen-badge]: https://img.shields.io/badge/commitizen-friendly-brightgreen.svg?style=flat
[create-react-app]: https://github.com/facebook/create-react-app
[transform-postcss]: https://github.com/wbyoung/babel-plugin-transform-postcss 

