'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('auction_rounds', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      auction_id: { type: Sequelize.INTEGER, allowNull: false, unique: true }, // KSI auctionId
      category: { type: Sequelize.STRING(32) }, // car / general / real-estate
      government: { type: Sequelize.STRING },
      sample_title: { type: Sequelize.STRING },
      sample_item_id: { type: Sequelize.INTEGER },
      entry_start: { type: Sequelize.STRING(32) },
      entry_end: { type: Sequelize.STRING(32) },
      bid_start: { type: Sequelize.STRING(32) },
      bid_end: { type: Sequelize.STRING(32) },
      first_seen_at: { type: Sequelize.DATE, allowNull: false },
      dismissed_at: { type: Sequelize.DATE },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('auction_rounds', ['auction_id']);
    await queryInterface.addIndex('auction_rounds', ['dismissed_at']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('auction_rounds');
  },
};
