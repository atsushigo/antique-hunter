'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('appraisal_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      image_hash: { type: Sequelize.STRING(64), allowNull: false },
      image_bytes: { type: Sequelize.INTEGER },
      image_width: { type: Sequelize.INTEGER },
      image_height: { type: Sequelize.INTEGER },
      category: { type: Sequelize.STRING },
      era: { type: Sequelize.STRING },
      price_min_jpy: { type: Sequelize.INTEGER },
      price_max_jpy: { type: Sequelize.INTEGER },
      confidence: { type: Sequelize.FLOAT },
      authenticity_risk: { type: Sequelize.STRING(16) },
      notes: { type: Sequelize.TEXT },
      raw_response: { type: Sequelize.TEXT },
      model_used: { type: Sequelize.STRING },
      latency_ms: { type: Sequelize.INTEGER },
      mock: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('appraisal_logs', ['image_hash']);
    await queryInterface.addIndex('appraisal_logs', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('appraisal_logs');
  },
};
