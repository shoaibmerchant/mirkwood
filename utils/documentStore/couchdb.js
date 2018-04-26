import flatten from 'flat';
const nano = require('nano');
import uuid from 'uuid';

import { map, keys, values, mapValues } from 'lodash';

class CouchDbDatabaseAdapter {

	constructor(connection) {
		this.nano = nano(this._uri(connection));
		// Default database to use
		this.client = this.nano.use(connection.database);
	}

	_uri(connection) {
		return `${connection.protocol}://${connection.user}:${connection.password}@${connection.host}:${connection.port}`;
	}

	createStore({name}) {
		return new Promise((resolve, reject) => {
			this.nano.db.create(name, (err, body) => {
				if (err) {
					reject(err);
				} else {
					resolve(true);
				}
			});
		})
	}

	replicate({source, target, createTarget}) {
		createTarget = createTarget || false;
		return new Promise((resolve, reject) => {
			this.nano.db.replicate(source, target, { create_target: createTarget },
			(err, body) => {
				if (err) {
					reject(err);
				} else {
					resolve(true);
				}
			});
		})
	}

	create(modelName, input, store) {
		let client = this.client;
		if (store) {
			client = this.nano.use(store);
		}
		return new Promise((resolve, reject) => {
			client.insert(input, input._id || uuid.v4(), (err, body) => {
				if (err) {
					reject(err);
				} else {
					resolve({_id: body.id});
				}
			})
		})
	}

	update(modelName, {input, _id, store}) {
		let client = this.client;
		if (store) {
			client = this.nano.use(store);
		}
		return new Promise((resolve, reject) => {
			if (input._rev) {
				client.insert(input, (err, body) => {
					if (err) {
						reject(false);
					} else {
						resolve(true);
					}
				})
			} else {
				client.get(_id, {}, (err, body) => {
					if (err) {
						reject(false);
					} else {
						let updatedObject = {
							...body,
							...input
						};
						client.insert(updatedObject, (err, body) => {
							if (err) {
								reject(false);
							} else {
								resolve(true);
							}
						})
					}
				})
			}
		})
	}

	delete(modelName, {_rev, _id, store}) {
		let client = this.client;
		if (store) {
			client = this.nano.use(store);
		}
		return new Promise((resolve, reject) => {
			if (_rev) {
				client.destroy(_id, _rev, (err, body) => {
					if (err) {
						reject(false);
					} else {
						resolve(true);
					}
				})
			} else {
				client.get(_id, {}, (err, body) => {
					if (err) {
						reject(false);
					} else {
						client.destroy(_id, body._rev, (err, body) => {
							if (err) {
								reject(false);
							} else {
								resolve(true);
							}
						})
					}
				})
			}
		})
	}

	one(modelName, input) {
		let client = this.client;
		if (input.store) {
			client = this.nano.use(input.store);
		}
		return new Promise((resolve, reject) => {
			client.get(input._id, {}, (err, body) => {
				if (err) {
					reject(err);
				} else {
					resolve(body);
				}
			})
		});
	}

	fetch(modelName, input) {
		let client = this.client;
		if (input.store) {
			client = this.nano.use(input.store);
		}
		return new Promise((resolve, reject) => {
			let fetchObj = {};
			let fetchKeys = {};
			if (input.keys) {
				fetchKeys.keys = input.keys;
			}

			if (input.key) {
				fetchObj.key = input.key;
			}

			if (input.startkey) {
				if (input.startkey.length === 1) {
					fetchObj.startkey = input.startkey[0];
				}
			}

			if (input.endkey) {
				if (input.endkey.length === 1) {
					fetchObj.endkey = input.endkey[0];
				}
			}

			client.fetch(fetchKeys, fetchObj, (err, body) => {
				if (err) {
					reject(err);
				} else {
					let rowsToSend = body.rows.map((row) => {
						return row.doc;
					});
					resolve(rowsToSend);
				}

			})
		});
	}

	view(modelName, input) {
		let client = this.client;
		if (input.store) {
			client = this.nano.use(input.store);
		}
		return new Promise((resolve, reject) => {
			let fetchObj = {
				include_docs: true
			};
			if (input.keys) {
				fetchObj.keys = input.keys;
			}

			if (input.key) {
				fetchObj.key = input.key;
			}

			if (input.startkey) {
				if (input.startkey.length === 1) {
					fetchObj.startkey = input.startkey[0];
				}
			}

			if (input.endkey) {
				if (input.endkey.length === 1) {
					fetchObj.endkey = input.endkey[0];
				}
			}

			client.view(input.design, input.view, fetchObj, (err, body) => {
				if (err) {
					reject(err);
				} else {
					let rowsToSend = body.rows.map((row) => {
						return row.doc;
					});
					resolve(rowsToSend);
				}

			})
		});
	}

}

export default CouchDbDatabaseAdapter;
