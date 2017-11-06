import { GraphQLList, GraphQLInputObjectType, GraphQLObjectType, GraphQLString,
	GraphQLID, GraphQLInt, GraphQLBoolean } from 'graphql';
import Types from '../../lib/types';
import Database from './database';
import Resolver from '../../lib/resolver';

class DatabaseMutations {

	constructor() {
	}

  resolvers() {
    return {
      create: this.createResolver,
      update: this.updateResolver,
      destroy: this.destroyResolver
    };
  }

	generate(type, inputType, model) {
		let schema = model.schema;

		let modelDatasource = schema.datasource
		let modelName = schema.name;

		return new GraphQLObjectType({
			name: [modelName, 'Database_Mutation'].join(''),
			fields: {
				create: this.createResolver('database.create', type, model, {
					args: {
						input: {
							type: inputType
						}
					}
				}),
				createMany: this.createResolver('database.create', type, model, {
					args: {
						input: {
							type: [inputType]
						}
					}
				}),
				update: this.updateResolver('database.update', type, model, {
					args: {
						_id: {
							type: Types.ID
						},
						input: {
							type: inputType
						}
					}
				}),
				destroy: this.destroyResolver('database.destroy', type, model, {
					args: {
						_id: {
							type: Types.ID
						}
					}
				})
			}
		});
	}

	createResolver(resolverName, type, model, inputSchema) {
		let modelDatasource = model.schema.datasource;
		let args = inputSchema.args;
		let argsObjects = Types.generateArgs(args, inputSchema.name);

		return {
			type: Array.isArray(args.input.type) ? Types.Int : type,
			args: argsObjects,
			resolve: new Resolver(resolverName, (_, args) => {
				let input = args.input; // take first property
				let result = new Promise((resolve, reject) => {

					if (Array.isArray(input)) {
						Database.createMany(modelDatasource, input)
							.then(count => {
								resolve(count);
							});
					} else {
						Database.create(modelDatasource, input)
							.then(id => {
								resolve(Database.one(modelDatasource, id));
							});
					}

				})
				return result;
			})
		};
	}

	updateResolver(resolverName, type, model, inputSchema) {
		let modelDatasource = model.schema.datasource;
		let args = inputSchema.args;

		// check if where is not specified then generate default
		if (!args.find && !args._id) {
			args.find = {
				fields: {
					_id: {
						type: Types.ID
					}
				}
			};
		}

		let argsObjects = Types.generateArgs(args, inputSchema.name);

		return {
			type: GraphQLBoolean,
			args: argsObjects,
			resolve: new Resolver(resolverName, (_, args) => {
				if (!args.find) {
					args.find = { _id: args._id };
				}

				let find = args.find;
				let input = args.input;

				let result = new Promise((resolve, reject) => {
					Database.update(modelDatasource, find, input)
						.then(res => {
							resolve(res);
						});
				})
				return result;
			})
		};
	}

	destroyResolver(resolverName, type, model, inputSchema) {
		let modelDatasource = model.schema.datasource;
		let args = inputSchema.args;

		// check if where is not specified then generate default
		if (!args.find && !args._id) {
			args.find = {
				fields: {
					_id: {
						type: Types.ID
					}
				}
			};
		}

		let argsObjects = Types.generateArgs(args, inputSchema.name);

		return {
			type: GraphQLBoolean,
			args: argsObjects,
			resolve: new Resolver(resolverName, (_, args) => {
        if (!args.find) {
					args.find = { _id: args._id };
				}

				let find = args.find;

				let result = new Promise((resolve, reject) => {
					Database.destroy(modelDatasource, find)
						.then(res => {
							resolve(res);
						});
				})
				return result;
			})
		};
	}
}

export default (new DatabaseMutations());
