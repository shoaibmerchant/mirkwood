import flatten from 'flat';
import { map, keys, values, mapValues } from 'lodash';
import knex from 'knex';
import uuid from 'uuid';

class PostgresqlDatabaseAdapter {

	constructor(connection) {
    this.db = knex({
      client: 'pg',
      connection: {
        host : connection.host || 'localhost',
        user : connection.user || 'root',
        password : connection.password || '',
        database : connection.database || 'pgsql',
        port: connection.port || '5432'
      },
      debug: process.env['NODE_ENV'] === 'development' ? true : false
    });
	}

	_operatorMatch(operator) {
		switch(operator) {
			case '$eq':
				return '=';
			case '$gt':
				return '>';
			case '$gte':
				return '>=';
			case '$lt':
				return '<';
			case '$lte':
				return '<=';
			case '$like':
				return 'like';
			case '$nin':
				return 'not in';
			case '$in':
				return 'in';
		}
	}
	_resolveQuery(query, queryBuilder) {
		let self = this;

		if (query.and) {
			for (let qIdx=0; qIdx<query.and.length; qIdx++) {
				let subQuery = query.and[qIdx];

				queryBuilder.where(function() {
					self._resolveQuery(subQuery, this);
				})
			}
		} else if (query.not) {
			for (let qIdx=0; qIdx<query.not.length; qIdx++) {
				let subQuery = query.not[qIdx];

				queryBuilder.whereNot(function() {
					self._resolveQuery(subQuery, this);
				})
			}
		} else if (query.or) {
			for (let qIdx=0; qIdx<query.or.length; qIdx++) {
				let subQuery = query.or[qIdx];

				if (qIdx === 0) {
					queryBuilder.where(function() {
						self._resolveQuery(subQuery, this);
					})
				} else {
					queryBuilder.orWhere(function() {
						self._resolveQuery(subQuery, this);
					})
				}
			}
		} else {
			let keyCount = keys(query.fields).length;
			let resolvedSubQueries = [];

			for (let key of Object.keys(query.fields)) {
				let subQuery = query.fields[key];
				let subQueryValue = subQuery.value;

				if ((subQuery.operator === '$in' || subQuery.operator === '$nin') && Array.isArray(subQuery.values)) {
					subQueryValue = subQuery.values;
				}

				if(subQuery.operator === '$exists') {
					queryBuilder.whereNotNull(key);
				} else {
					queryBuilder.where(key, this._operatorMatch(subQuery.operator), subQueryValue);
				}
			}
		}
	}

	_resolveFind(find, queryBuilder) {
		for(let key of Object.keys(find)) {
			if(Array.isArray(find[key])) {
				queryBuilder.whereIn(key, find[key]);
			} else {
				queryBuilder.where(key, find[key]);
			}
		}
	}

	all(datasource, args) {
		let self = this;
		let dbPromise = new Promise((resolve, reject) => {
      let tableName = datasource.table || datasource.collection;

      this.db.select().table(tableName)
        .modify(function(queryBuilder) {
					if (args.find) {
						self._resolveFind(args.find, queryBuilder)
					}

					if (args.query) {
						self._resolveQuery(args.query, queryBuilder)
					}

					if (args.sort) {
            queryBuilder.orderBy(args.sort.field, args.sort.order);
          }
        })
        .limit(args.limit)
        .offset(args.skip)
        .then((res) => {
          resolve(res);
        })
        .catch((err) => {
          reject(err);
        })
		});
		return dbPromise;
	}

	count(datasource, args) {
		let dbPromise = new Promise((resolve, reject) => {
      let tableName = datasource.table || datasource.collection;

      this.db.select().count().table(tableName)
        .then((res) => {
          resolve(res[0].count);
        })
        .catch((err) => {
          reject(err);
        })
		});
		return dbPromise;
	}

	one(datasource, find, args) {
    let dbPromise = new Promise((resolve, reject) => {
      let tableName = datasource.table || datasource.collection;

      this.db.select().where(find).limit(1).table(tableName)
        .then((res) => {
          resolve(res[0]);
        })
        .catch((err) => {
          reject(err);
        })
		});
		return dbPromise;
	}

	destroy(datasource, find, args) {
		let dbPromise = new Promise((resolve, reject) => {
      let tableName = datasource.table || datasource.collection;

      this.db(tableName).where(find).del()
        .then((res) => {
          resolve(true);
        })
        .catch(reject);
		});
		return dbPromise;
	}

	create(datasource, row, args) {
		let dbPromise = new Promise((resolve, reject) => {
      let tableName = datasource.table || datasource.collection;

      row._id = uuid.v4();

      this.db(tableName).insert(row)
        .then((res) => {
          return this.one(datasource, { _id: row._id })
        })
        .then(resolve)
        .catch(reject);
		});
		return dbPromise;
	}

	createMany(datasource, rows, args) {
		let dbPromise = new Promise((resolve, reject) => {
      let tableName = datasource.table || datasource.collection;

      rows = rows.map(row => {
        row._id = uuid.v4();
        return row;
      })

      this.db(tableName).insert(rows)
        .then(res => resolve(res.rowCount))
        .catch(reject);
		});
		return dbPromise;
	}

	update(datasource, find, row, args) {
    let dbPromise = new Promise((resolve, reject) => {
      let tableName = datasource.table || datasource.collection;

      this.db(tableName).where(find).update(row)
        .then((res) => {
          resolve(true);
        })
        .catch(reject);
		});
		return dbPromise;
	}
}

export default PostgresqlDatabaseAdapter;
