'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('search_keywords', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      keyword: { type: Sequelize.STRING, allowNull: false },
      sites: { type: Sequelize.STRING, allowNull: false }, // CSV: "yahoo_auction,jimoty"
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      last_run_at: { type: Sequelize.DATE },
      last_error: { type: Sequelize.STRING },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('search_keywords', ['is_active']);

    await queryInterface.createTable('tracked_listings', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      keyword_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'search_keywords', key: 'id' },
        onDelete: 'CASCADE',
      },
      site: { type: Sequelize.STRING(32), allowNull: false },
      source_url: { type: Sequelize.STRING, allowNull: false },
      image_url: { type: Sequelize.STRING },
      title: { type: Sequelize.STRING },
      price_jpy: { type: Sequelize.INTEGER },
      price_label: { type: Sequelize.STRING(32) },
      first_seen_at: { type: Sequelize.DATE, allowNull: false },
      is_dismissed: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('tracked_listings', ['keyword_id', 'source_url'], { unique: true });
    await queryInterface.addIndex('tracked_listings', ['first_seen_at']);
    await queryInterface.addIndex('tracked_listings', ['is_dismissed']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('tracked_listings');
    await queryInterface.dropTable('search_keywords');
  },
};
