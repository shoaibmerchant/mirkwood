import adapters from './adapters';

const DEFAULT_CONNECTION = 'development';
const DEFAULT_ADAPTER = 'mongodb';

class Database {

	static init({ config }) {
		this.config = config;
	}

	static getConnection = (datasource) => {
		let dbConnectionParams = Database.config[datasource.connection || process.env['NODE_ENV'] || 'development'];
		let dbAdapter = adapters[dbConnectionParams.adapter || DEFAULT_ADAPTER];

		return new dbAdapter(dbConnectionParams);
	}

	static all = (datasource, args) => {
		let dbConnection = Database.getConnection(datasource);
		return dbConnection.all(datasource, args);
	}

	static count = (datasource, args) => {
		let dbConnection = Database.getConnection(datasource);
		return dbConnection.count(datasource, args);
	}

	static create = (datasource, row, args) => {
		let dbConnection = Database.getConnection(datasource);
		return dbConnection.create(datasource, row, args);
	}

	static createMany = (datasource, rows, args) => {
		let dbConnection = Database.getConnection(datasource);
		return dbConnection.createMany(datasource, rows, args);
	}

	static update = (datasource, find, row, args) => {
		let dbConnection = Database.getConnection(datasource);
		return dbConnection.update(datasource, find, row, args);
	}

	static destroy = (datasource, find, args) => {
		let dbConnection = Database.getConnection(datasource);
		return dbConnection.destroy(datasource, find, args);
	}

	static one = (datasource, find, args) => {
		let dbConnection = Database.getConnection(datasource);
		return dbConnection.one(datasource, find, args);
	}
}

export default Database;
