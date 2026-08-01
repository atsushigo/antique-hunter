'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // AppraisalLog 加 authenticity_checks（JSON 存 array of {aspect, observation, verdict}）
    await queryInterface.addColumn('appraisal_logs', 'authenticity_checks', {
      type: Sequelize.TEXT, // SQLite 無 JSON 型別，用 TEXT 存 JSON string
    });

    // PriceSnapshot：同 URL 時序價格
    await queryInterface.createTable('price_snapshots', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      source_url: { type: Sequelize.STRING, allowNull: false },
      source_host: { type: Sequelize.STRING },
      price_jpy: { type: Sequelize.INTEGER, allowNull: false },
      seen_at: { type: Sequelize.DATE, allowNull: false },
      source_type: { type: Sequelize.STRING(16) }, // 'tracked' | 'appraisal' | 'search'
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('price_snapshots', ['source_url', 'seen_at']);
    await queryInterface.addIndex('price_snapshots', ['seen_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('price_snapshots');
    await queryInterface.removeColumn('appraisal_logs', 'authenticity_checks');
  },
};
