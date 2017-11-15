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

	_resolveQuery = (query) => {

	}
	_resolveFind = (find) => {

	}

	all = (datasource, args) => {
		let dbPromise = new Promise((resolve, reject) => {
      let tableName = datasource.table || datasource.collection;
      this.db.select().table(tableName)
        .then((res) => {
          resolve(res);
        })
        .catch((err) => {
          reject(err);
        })
		});
		return dbPromise;
	}

	count = (datasource, args) => {
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

	one = (datasource, find, args) => {
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

	destroy = (datasource, find, args) => {
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

	create = (datasource, row, args) => {
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

	createMany = (datasource, rows, args) => {
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

	update = (datasource, find, row, args) => {
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
