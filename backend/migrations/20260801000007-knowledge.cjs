'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('auction_knowledge', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      category: { type: Sequelize.STRING(32) }, // car / general / real-estate / antique / bike ...
      title: { type: Sequelize.STRING, allowNull: false },
      source_url: { type: Sequelize.STRING },
      source_site: { type: Sequelize.STRING(32) }, // kankocho / yahoo_auction / jimoty ...
      listing_price_jpy: { type: Sequelize.INTEGER }, // 起標/掛牌價
      winning_price_jpy: { type: Sequelize.INTEGER }, // 實際成交價（Sam 事後填）
      did_i_bid: { type: Sequelize.BOOLEAN, defaultValue: false },
      my_appraisal_low_jpy: { type: Sequelize.INTEGER },
      my_appraisal_high_jpy: { type: Sequelize.INTEGER },
      notes: { type: Sequelize.TEXT },
      tags: { type: Sequelize.STRING }, // comma-separated
      observed_at: { type: Sequelize.DATE },
      settled_at: { type: Sequelize.DATE },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('auction_knowledge', ['category']);
    await queryInterface.addIndex('auction_knowledge', ['source_site']);
    await queryInterface.addIndex('auction_knowledge', ['settled_at']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('auction_knowledge');
  },
};
