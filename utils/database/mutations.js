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
						},
						acl: {
							type: [Types.AclType],
							defaultValue: false
						},
						method: {
							type: Types.String
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
							type: Types.ID,
							deprecationReason: 'Use find argument instead of _id as it supports more options'
						},
						find: {
							type: Database.generateFindType(model)
						},
						input: {
							type: DatabaseMutations.generateUpdateType(model)
						}
					}
				}),
				destroy: this.destroyResolver('database.destroy', type, model, {
					args: {
						_id: {
							type: Types.ID,
							deprecationReason: 'Use find argument instead of _id as it supports more options'
						},
						find: {
							type: Database.generateFindType(model)
						}
					}
				}),
				delete: this.deleteResolver('database.delete', type, model, {
					args: {
						_id: {
							type: Types.ID,
							deprecationReason: 'Use find argument instead of _id as it supports more options'
						},
						find: {
							type: Database.generateFindType(model)
						}
					}
				})
			}
		});
	}

	static generateUpdateType(model) {
		let schema = model.schema;
		let modelName = schema.name;

		let updateTypeName = [modelName, 'Update'].join('_');

		// fetch if exists
		if (Types.get(updateTypeName)) {
			return Types.get(updateTypeName);
		}

		return Types.generateInputType({
		  name: updateTypeName,
		  fields: schema.fields
		}, ['defaultValue']); // sp that defaultValue is filtered out
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
				let acl = args.acl;
				let method = args.method;
				let result = new Promise((resolve, reject) => {

					if (Array.isArray(input)) {
						Database.createMany(modelDatasource, input, {acl , method})
							.then(count => {
								resolve(count);
							})
							.catch(reject);
					} else {
						Database.create(modelDatasource, input, {acl , method})
							.then(res => {
								resolve(res);
							})
							.catch(reject);
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

	deleteResolver(resolverName, type, model, inputSchema) {
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
					Database.delete(modelDatasource, find)
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
