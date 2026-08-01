'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('market_events', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      market_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'markets', key: 'id' },
        onDelete: 'CASCADE',
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      note: { type: Sequelize.STRING },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('market_events', ['date']);
    await queryInterface.addIndex('market_events', ['market_id', 'date'], { unique: true });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('market_events');
  },
};
