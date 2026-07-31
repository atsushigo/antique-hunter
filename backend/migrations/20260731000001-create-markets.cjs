'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('markets', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: { type: Sequelize.STRING, allowNull: false },
      location: { type: Sequelize.STRING, allowNull: false },
      schedule_type: { type: Sequelize.STRING, allowNull: false },
      schedule_rule: { type: Sequelize.STRING, allowNull: false },
      time_range: { type: Sequelize.STRING },
      theme: { type: Sequelize.TEXT },
      scale: { type: Sequelize.STRING },
      drive_time_min: { type: Sequelize.INTEGER },
      toll_yen: { type: Sequelize.INTEGER },
      route: { type: Sequelize.STRING },
      notes: { type: Sequelize.TEXT },
      source_url: { type: Sequelize.STRING },
      position: { type: Sequelize.INTEGER, defaultValue: 100 },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('markets', ['position']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('markets');
  },
};
