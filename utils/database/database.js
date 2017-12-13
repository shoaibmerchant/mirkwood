import adapters from './adapters';
import moment from 'moment';
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
		row = Database.extend('create', row, datasource);

		return dbConnection.create(datasource, row, args);
	}

	static createMany = (datasource, rows, args) => {
		let dbConnection = Database.getConnection(datasource);
		rows = Database.extend('create', rows, datasource);

		return dbConnection.createMany(datasource, rows, args);
	}

	static update = (datasource, find, row, args) => {
		let dbConnection = Database.getConnection(datasource);
		row = Database.extend('update', row, datasource);

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

	static extend = (mode, row, datasource) => {
		if (Array.isArray(row)) {
			let rows = row;
			return rows.map(row => Database.extend(mode, row, datasource));
		}

		// check timestamps options
		if (datasource.timestamps) {

			if (mode === 'create') {
				row._created_at = moment.utc().format();
				row._updated_at = moment.utc().format();
			}

			if (mode === 'update') {
				row._updated_at = moment.utc().format();
			}
		}
		return row;
	}
}

export default Database;
