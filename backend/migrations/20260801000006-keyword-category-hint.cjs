'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('search_keywords', 'category_hint', {
      type: Sequelize.STRING(16),
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('search_keywords', 'category_hint');
  },
};
