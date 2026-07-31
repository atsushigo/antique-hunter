require('dotenv').config({ path: require('path').resolve(__dirname, '..', '..', '.env') });
const path = require('path');

const storage = path.resolve(
  __dirname,
  '..',
  process.env.DATABASE_PATH || './data/antique_hunter.sqlite'
);

const base = {
  dialect: 'sqlite',
  storage,
  define: { underscored: true, timestamps: true },
};

module.exports = {
  development: base,
  test: { ...base, storage: ':memory:' },
  production: base,
};
