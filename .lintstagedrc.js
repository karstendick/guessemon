export default {
  '*.{ts,tsx,js,jsx}': ['prettier --write', 'eslint --fix', () => 'tsc -b'],
  '*.{json,md,yml,yaml,css}': ['prettier --write'],
};
