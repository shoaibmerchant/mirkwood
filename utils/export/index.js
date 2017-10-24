import { GraphQLObjectType } from 'graphql';
import fs from 'fs';
import mkdirp from 'mkdirp';
import path from 'path';
import csv from 'fast-csv';
import { keys, values, map } from 'lodash';
import Types from '../../lib/types';
import Resolver from '../../lib/resolver';

class ExportUtility {

	constructor() {
		this.resolvers = {
			csv: this.csvResolver,
			pdf: this.pdfResolver
		};
	}

	csvResolver(resolverName, type, model, inputSchema) {
		let args = inputSchema.args;

		args = {
			dir: {
				type: Types.String,
				defaultValue: 'tmp'
			},
			filename: {
				type: Types.String,
				required: true
			},
			data: {
				type: Types.List(type),
				required: true
			},
			headers: {
				type: Types.Boolean,
				defaultValue: true
			},
			...args
		};

		let argsObjects = Types.generateArgs(args, inputSchema.name);

		return {
			type: type || Types.Boolean,
			args: argsObjects,
			resolve: new Resolver(resolverName, (_, args, ctx) => {
				let dir = args.dir;
				let filepath = path.resolve(args.dir, args.filename);
				let data = args.data;

				return new Promise((resolve, reject) => {
					mkdirp(args.dir, { mode: '0750' }, (err) => {
            if (err) {
              reject(false);
							return;
            }

						let csvStream = csv.createWriteStream({ headers: args.headers });
						let ws = fs.createWriteStream(filepath);

						ws.on('error', function(){
						  console.log('Error');
							reject(false);
						});

						ws.on('finish', function(){
						  console.log('done');
							resolve(true);
						});

						if (!data.length > 0) {
							csvStream.end();
						}

						// write the csv
						csvStream.pipe(ws);
						csvStream.write(keys(data[0]));

						// iterate
						map(data, (iter) => {
							csvStream.write(values(iter));
						});

						csvStream.end();
          });
        });
			})
		};
	}

	pdfResolver(resolverName, type, model, inputSchema) {
	}

	mutations(type, inputType, model) {
		let schema = model.schema;
		let modelName = schema.name;

		return new GraphQLObjectType({
			name: [modelName, 'Export_Mutation'].join(''),
			fields: {
				csv: this.csvResolver('export.csv', Types.Boolean, model, {
					args: {
						data: {
							type: Types.List(inputType),
							required: true
						}
					}
				})
				// pdf: this.pdfResolver('export.pdf', Types.Boolean, model, {
				// 	args: {}
				// })
			}
		});
	}

	queries(type, inputType, model) {
		return false;
	}
}

export default ExportUtility;
