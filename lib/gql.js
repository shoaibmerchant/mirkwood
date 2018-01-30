import { graphql } from 'graphql';
import { isInstance } from 'apollo-errors';
import { mapKeys, map, keys } from 'lodash';

class GQL {
	constructor({ schema, req }) {
		this._schema = schema;
		this._req = req;
	}
	query(queryStr, traversePath, { variables, context } = {}) {
		// clean queryStr append query wrapper if not added
		queryStr = queryStr.trim();

		if (!queryStr.startsWith('query')) {
			queryStr = `
				query {
					${queryStr}
				}
			`;
		}

		const query = queryStr;

		return new Promise((resolve, reject) => {
			graphql(
				this._schema,
				query,
				null,
				{
					...context,
					gql: this,
					req: this._req,
					gqlQuery: true
				},
				variables)
				.then(res => {
					// throw handled exception
					if (res.error || res.errors) {
						reject(res);
					}

					if (traversePath) {
						resolve(traversePath.split('.').reduce((obj, i) => obj[i], res.data));
					} else {
						resolve(res.data);
					}
				})
				.catch(err => {
					reject(err);
				})
		});
	}

	mutation(queryStr, traversePath, { variables, context } = {}) {
		// clean string and append mutation wrapper if not added
		queryStr = queryStr.trim();

		if (!queryStr.startsWith('mutation')) {
			queryStr = `
				mutation {
					${queryStr}
				}
			`;
		}

		const mutation = queryStr;

		return new Promise((resolve, reject) => {
			graphql(
				this._schema,
				mutation,
				null,
				{
					...context,
					gql: this,
					req: this._req,
					gqlQuery: true
				},
				variables)
				.then(res => {
					// throw handled exception
					if (res.error || res.errors) {
						reject(res);
					}

					if (traversePath) {
						resolve(traversePath.split('.').reduce((obj, i) => obj[i], res.data));
					} else {
						resolve(res.data);
					}
				})
				.catch(err => {
					reject(err);
				})
		});
	}

	fields(obj) {
			let objString = '';

			for (let key of Object.keys(obj)) {
				if (typeof obj[key] === 'object' && obj[key] !== null) {
					objString += [
						key,
						' {\n',
						this.fields(obj[key]),
						'}\n'].join('');
				} else {
					objString += [key,'\n'].join('')
				}
			}
			return objString;
	}

	esc(str) {
		return str.replace('"', '\"').replace('`', '\`');
		return str;
	}

	encode(obj) {
		let self = this;
		let encodedObj = '';

		// Case when array
		if (Array.isArray(obj)) {
				let arr = obj;
				let encodedArr = map(arr, (arrIter) => self.encode(arrIter)).join(',');
				return `[${encodedArr}]`;
		}
		// case when object
		else if(typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
				let encodedObjKeyValues = [];
				for (let key of Object.keys(obj)) {
					if (obj[key] !== null) {
						encodedObjKeyValues.push(`${key}:${self.encode(obj[key])}`);
					}
				}
				let encodedObj = encodedObjKeyValues.join(',')
				return `{${encodedObj}}`;
		}
		// case when String
		else if (typeof obj === 'string') {
			let str = obj;
			return `"${self.esc(str)}"`;
		} else if (obj === null) {
			return '';
		} else {
			return obj.toString();
		}
	}
}

export default GQL;
