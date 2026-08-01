'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('appraisal_logs', 'source_url', { type: Sequelize.STRING });
    await queryInterface.addColumn('appraisal_logs', 'source_title', { type: Sequelize.STRING });
    await queryInterface.addColumn('appraisal_logs', 'source_host', { type: Sequelize.STRING });
    await queryInterface.addColumn('appraisal_logs', 'listed_price_jpy', { type: Sequelize.INTEGER });
    await queryInterface.addColumn('appraisal_logs', 'price_verdict', { type: Sequelize.STRING(16) });
    await queryInterface.addColumn('appraisal_logs', 'is_collected', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    });
    await queryInterface.addIndex('appraisal_logs', ['is_collected']);
    await queryInterface.addIndex('appraisal_logs', ['source_host']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('appraisal_logs', ['source_host']);
    await queryInterface.removeIndex('appraisal_logs', ['is_collected']);
    await queryInterface.removeColumn('appraisal_logs', 'is_collected');
    await queryInterface.removeColumn('appraisal_logs', 'price_verdict');
    await queryInterface.removeColumn('appraisal_logs', 'listed_price_jpy');
    await queryInterface.removeColumn('appraisal_logs', 'source_host');
    await queryInterface.removeColumn('appraisal_logs', 'source_title');
    await queryInterface.removeColumn('appraisal_logs', 'source_url');
  },
};
