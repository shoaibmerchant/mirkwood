import adapters from './adapters';
import moment from 'moment';
import Types from '../../lib/types';
import { get } from 'lodash';
import { UnknownError, ForbiddenError, AuthenticationRequiredError } from '../../errors';

const DEFAULT_CONNECTION = 'development';
const DEFAULT_ADAPTER = 'postgresql';

class Database {

	static init({ config }) {
		this.config = config;
		this.connections = {};
	}

	static _checkAcl = (acl, method, entityToCheck) => {
		let allowed = true;
		if (acl && method) {
			allowed = false;
			console.log("entityToCheck: ", entityToCheck);
			for (let idx = 0; idx < acl.length; idx++) {
				let eachAcl = acl[idx];
				let resolvers = eachAcl.resolvers;
				let entities = eachAcl.entities;
				if (resolvers[0] === '*' || resolvers.indexOf(method) > -1) {
					if (!entityToCheck) {
						allowed = true;
						break;
					} else if (entities[0] === '*' || entities.indexOf(entityToCheck) > -1) {
						allowed = true;
						break;
					}
				}
			}
		}

		return allowed;
	}

	static getConnection = (name) => {
		let connectionName = name || process.env['NODE_ENV'] || 'development';
		let dbConnectionParams = Database.config[connectionName];
		let dbAdapter = adapters[dbConnectionParams.adapter || DEFAULT_ADAPTER];

		// check if connection exists
		if (Database.connections[connectionName]) {
			return Database.connections[connectionName];
		}

		let newConnection = new dbAdapter(dbConnectionParams);
		Database.connections[connectionName] = newConnection;
		return newConnection;
	}

	static all = (datasource, args) => {
		let dbConnection = Database.getConnection(datasource.connection);
		let entityToCheck = get(args, 'find._id');
		let allowed = Database._checkAcl(args.acl, args.method, entityToCheck);

		if (allowed) {
			return dbConnection.all(datasource, args);
		} else {
			throw new ForbiddenError();
		}
	}

	static count = (datasource, args) => {
		let dbConnection = Database.getConnection(datasource.connection);
		return dbConnection.count(datasource, args);
	}

	static create = (datasource, row, args) => {
		let dbConnection = Database.getConnection(datasource.connection);
		row = Database.extend('create', row, datasource);
		let allowed = true;
		if (args) {
			let entityToCheck = false
			allowed = Database._checkAcl(args.acl, args.method, entityToCheck);
		}

		if (allowed) {
			return dbConnection.create(datasource, row, args);
		} else {
			throw new ForbiddenError();
		}
	}

	static createMany = (datasource, rows, args) => {
		let dbConnection = Database.getConnection(datasource.connection);
		rows = Database.extend('create', rows, datasource);

		return dbConnection.createMany(datasource, rows, args);
	}

	static update = (datasource, find, row, args) => {
		let dbConnection = Database.getConnection(datasource.connection);
		row = Database.extend('update', row, datasource);

		return dbConnection.update(datasource, find, row, args);
	}

	static destroy = (datasource, find, args) => {
		let dbConnection = Database.getConnection(datasource.connection);
		return dbConnection.destroy(datasource, find, args);
	}

	static delete = (datasource, find, args) => {
		let dbConnection = Database.getConnection(datasource.connection);
		return dbConnection.delete(datasource, find, args);
	}

	static one = (datasource, find, args) => {
		let dbConnection = Database.getConnection(datasource.connection);
		let allowed = true;
		if (args) {
			let entityToCheck = get(find, '_id');
			allowed = Database._checkAcl(args.acl, args.method, entityToCheck);
		}

		if (allowed) {
			return dbConnection.one(datasource, find, args);
		} else {
			throw new ForbiddenError();
		}

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

	static generateFindType(model) {
		let schema = model.schema;
		let modelName = schema.name;

		let findTypeName = [modelName, 'Find'].join('_');

		// fetch if exists
		if (Types.get(findTypeName)) {
			return Types.get(findTypeName);
		}

		return Types.generateInputType({
		  name: findTypeName,
		  fields: schema.fields
		}, ['defaultValue']); // sp that defaultValue is filtered out
	}
}

export default Database;
