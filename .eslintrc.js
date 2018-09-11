// https://eslint.org/docs/user-guide/configuring

module.exports = {
  root: true,
  parserOptions: {
    parser: 'babel-eslint'
  },
  env: {
    browser: true,
  },
  extends: [
    // https://github.com/standard/standard/blob/master/docs/RULES-en.md
    'standard'
  ],
  // add your custom rules here
  rules: {
    // allow async-await
    'generator-star-spacing': 'off',
    // allow debugger during development
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    // always semi
    "semi": ["warn", "always"],
    // allow comma-dangle
    "comma-dangle": ["warn", "only-multiline"],
    // maxlen
    "max-len": ["warn", {"code": 500}],
    // space
    "space-before-function-paren": ["warn", "never"],
    "no-multi-spaces": ['warn', { ignoreEOLComments: true }]
  }
}
