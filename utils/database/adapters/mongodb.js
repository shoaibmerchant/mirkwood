import mongodb from 'mongodb';
const MongoClient = mongodb.MongoClient;
const ObjectID = mongodb.ObjectID;
import flatten from 'flat';
import { map, keys, values, mapValues } from 'lodash';

class MongoDbDatabaseAdapter {

	constructor(connection) {
		this.client = MongoClient.connect(this._uri(connection));
	}

	_uri(connection) {
		return `mongodb://${connection.host}:${connection.port}/${connection.database}`;
	}

	_resolveQuery(query) {
		if (query.and) {
			return {
				$and: map(query.and, (subQuery) => {
					return this._resolveQuery(subQuery)
				})
			}
		}
		if (query.or) {
			return {
				$or: map(query.or, (subQuery) => {
					return this._resolveQuery(subQuery)
				})
			}
		}
		if (query.not) {
			return {
				$not: map(query.not, (subQuery) => {
					return this._resolveQuery(subQuery)
				})
			}
		}
		if (query.nor) {
			return {
				$nor: map(query.or, (subQuery) => {
					return this._resolveQuery(subQuery)
				})
			}
		}

		let keyCount = keys(query.fields).length;
		let resolvedSubQueries = [];

		// flattening
		let flatFind = (fields, keys, schema) => {
			keys = keys ? keys : [];
			schema = schema ? schema : {};

			for(let key of Object.keys(fields)) {
				let field = fields[key];

				if (!field.operator) {
					schema = flatFind(field, keys.concat([key]), schema);
				} else {
					schema[keys.concat([key]).join('.')] = fields[key];
				}
			}
			return schema;
		}

		query.fields = flatFind(query.fields);

		for (let key of Object.keys(query.fields)) {
			let subQuery = query.fields[key];

			if (key === '_id') {
				subQuery.value = new ObjectID(subQuery.value);
				subQuery.values = subQuery.values.map((value) => {
					return new ObjectID(value);
				})
			}

			let subQueryValue = subQuery.value;

			if (subQuery.operator === '$in' && Array.isArray(subQuery.values)) {
				subQueryValue = subQuery.values;
			}

			if (subQuery.operator === '$nin' && Array.isArray(subQuery.values)) {
				subQueryValue = subQuery.values;
			}

			if (subQuery.operator === '$exists') {
				subQuery.value = true;
			}

			let resolvedSubQuery = {};
			resolvedSubQuery[key] = {};
			resolvedSubQuery[key][subQuery.operator] = subQueryValue;

			// add support for regex options
			if (subQuery.operator === '$regex' && subQuery.options && subQuery.options.match) {
				resolvedSubQuery[key]['$options'] = subQuery.options.match;
			}

			if (keyCount === 1) {
				return resolvedSubQuery;
			} else {
				resolvedSubQueries.push(resolvedSubQuery);
			}
		}

		return {
			$and: resolvedSubQueries
		};

	}
	_resolveFind(find) {
		let findQuery = {...find};

		// convert all collections (array of objects) to objects
		for(let key of Object.keys(find)) {
			let findField = findQuery[key];

			if (Array.isArray(findField) && findField.length > 0 && typeof findField[0] === 'object') {
				findQuery[key] = findField[0];
			}
		}

		// flatten all keys
		findQuery = flatten(findQuery);

		return mapValues(findQuery, (query) => {
			if (Array.isArray(query)) {
				query = {
					$in: query
				}
			}
			return query;
		});
	}

	all(datasource, args) {
		let dbPromise = new Promise((resolve, reject) => {
			this.client
				.then(db => {
					let collectionName = datasource.collection || datasource.table;
					let collection = db.collection(collectionName);

					// resolve find arg
					let find = args.find || {};
					let resolvedFind = this._resolveFind(find);

					if (resolvedFind._id) {
						resolvedFind._id = new ObjectID(resolvedFind._id);
					}

					// resolve query arg
					let query = args.query || false;

					// override resovledFind if query is specified
					if (args.query) {
						resolvedFind = this._resolveQuery(query);
					}

					args.sort = args.sort ? args.sort : {};
					let sort = {};

					if (args.sort && args.sort.field) {
						sort[args.sort.field] = args.sort.order === 'asc' ? 1: -1;
					}

					if (args.orderBy && args.orderBy.length > 0) {
						args.orderBy.map(orderBy => {
							sort[orderBy.field] = orderBy.order === 'asc' ? 1: -1;
						})
					}

					return collection.find(resolvedFind).sort(sort).skip(args.skip).limit(args.limit).toArray();
				})
				.then(res => {
					resolve(res);
				})
				.catch(err => {
					reject(err);
				})
		});
		return dbPromise;
	}

	count(datasource, args) {
		let dbPromise = new Promise((resolve, reject) => {
			this.client
				.then(db => {
					let collectionName = datasource.collection || datasource.table;
					let collection = db.collection(collectionName);

					let find = args.find || {};
					let resolvedFind = this._resolveFind(find);

					if (resolvedFind._id) {
						resolvedFind._id = new ObjectID(resolvedFind._id);
					}

					// resolve query arg
					let query = args.query || false;

					// override resovledFind if query is specified
					if (args.query) {
						resolvedFind = this._resolveQuery(query);
					}

					return collection.count(resolvedFind);
				})
				.then(res => {
					resolve(res);
				})
				.catch(err => {
					reject(err);
				})
		});
		return dbPromise;
	}

	one(datasource, find, args) {
		let dbPromise = new Promise((resolve, reject) => {
			this.client
				.then(db => {
					let collectionName = datasource.collection || datasource.table;
					let collection = db.collection(collectionName);

					let resolvedFind = this._resolveFind(find);

					if (resolvedFind._id) {
						resolvedFind._id = new ObjectID(resolvedFind._id);
					}

					return collection.findOne(resolvedFind);
				})
				.then(res => {
					resolve(res);
				})
				.catch(err => {
					reject(err);
				})
		});
		return dbPromise;
	}

	destroy(datasource, find, args) {
		let dbPromise = new Promise((resolve, reject) => {
			this.client
				.then(db => {
					let collectionName = datasource.collection || datasource.table;
					let collection = db.collection(collectionName);

					if (find._id) {
						find._id = new ObjectID(find._id);
					}

					return collection.deleteOne(find);
				})
				.then(res => {
					if (res.result.ok) {
						resolve(true);
					} else {
						resolve(false);
					}
				})
				.catch(err => {
					reject(err);
				})
		});
		return dbPromise;
	}

	create = (datasource, document, args) => {
		let self = this;
		let dbPromise = new Promise((resolve, reject) => {
			this.client
				.then(db => {
					let collectionName = datasource.collection || datasource.table;
					let collection = db.collection(collectionName);

					return collection.insertOne(document)
				})
				.then(res => {
					return self.one(datasource, { _id: res.insertedId.toString() });
				})
				.then(resolve)
				.catch(reject);
		});
		return dbPromise;
	}

	createMany(datasource, documents, args) {
		let dbPromise = new Promise((resolve, reject) => {
			this.client
				.then(db => {
					let collectionName = datasource.collection || datasource.table;
					let collection = db.collection(collectionName);

					return collection.insertMany(documents);
				})
				.then(res => {
					resolve(res.insertedCount);
				})
				.catch(err => {
					reject(err);
				})
		});
		return dbPromise;
	}

	update(datasource, find, document, args) {
		let dbPromise = new Promise((resolve, reject) => {
			this.client
				.then(db => {
					let collectionName = datasource.collection || datasource.table;
					let collection = db.collection(collectionName);

					if (find._id) {
						find._id = new ObjectID(find._id);
					}

					return collection.updateOne(
						find,
						{ $set: document },
						{
							upsert: true
						}
					);
				})
				.then(res => {
					if (res.modifiedCount > 0) {
						resolve(true);
					} else {
						resolve(false);
					}
				})
				.catch(err => {
					reject(err);
				})
		});
		return dbPromise;
	}
}

export default MongoDbDatabaseAdapter;
