import mongodb from 'mongodb';
const MongoClient = mongodb.MongoClient;
const ObjectID = mongodb.ObjectID;
import { mapValues } from 'lodash';

class MongoDbDatabaseAdapter {

	constructor(connection) {
		this.db = MongoClient.connect(this._uri(connection));
	}

	_uri = (connection) => {
		return `mongodb://${connection.host}:${connection.port}/${connection.database}`;
	}

	_resolveFind = (find) => {
		let findQuery = {...find};

		return mapValues(findQuery, (query) => {
			if (Array.isArray(query)) {
				query = {
					$in: query
				}
			}
			return query;
		});
	}

	all = (datasource, args) => {
		let dbPromise = new Promise((resolve, reject) => {
			this.db
				.then(db => {
					let collectionName = datasource.collection || datasource.table;
					let collection = db.collection(collectionName);

					let find = args.find || {};

					if (find._id) {
						find._id = new ObjectID(find._id);
					}

					let resolvedFind = this._resolveFind(find);

					args.sort = args.sort ? args.sort : {};
					let sort = [ args.sort.field || false, args.sort.order === 'asc' ? 1: -1 ];
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

	count = (datasource, args) => {
		let dbPromise = new Promise((resolve, reject) => {
			this.db
				.then(db => {
					let collectionName = datasource.collection || datasource.table;
					let collection = db.collection(collectionName);

					let find = args.find || {};

					if (find._id) {
						find._id = new ObjectID(find._id);
					}

					let resolvedFind = this._resolveFind(find);
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

	one = (datasource, find, args) => {
		let dbPromise = new Promise((resolve, reject) => {
			this.db
				.then(db => {
					let collectionName = datasource.collection || datasource.table;
					let collection = db.collection(collectionName);

					if (find._id) {
						find._id = new ObjectID(find._id);
					}

					let resolvedFind = this._resolveFind(find);
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

	destroy = (datasource, find, args) => {
		let dbPromise = new Promise((resolve, reject) => {
			this.db
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
		let dbPromise = new Promise((resolve, reject) => {
			this.db
				.then(db => {
					let collectionName = datasource.collection || datasource.table;
					let collection = db.collection(collectionName);

					return collection.insertOne(document);
				})
				.then(res => {
					resolve(res.insertedId);
				})
				.catch(err => {
					reject(err);
				})
		});
		return dbPromise;
	}

	update = (datasource, find, document, args) => {
		let dbPromise = new Promise((resolve, reject) => {
			this.db
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
