'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('search_keywords', 'exclude_keywords', {
      type: Sequelize.TEXT,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('search_keywords', 'exclude_keywords');
  },
};
