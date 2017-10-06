import { GraphQLList, GraphQLInputObjectType, GraphQLObjectType, GraphQLString,
	GraphQLID, GraphQLInt, GraphQLBoolean } from 'graphql';
import Types from '../../lib/types';
import Resolver from '../../lib/resolver';

class SessionUtility {

	constructor() {
		this.resolvers = {
			write: this.writeResolver,
			read: this.readResolver,
			exists: this.existsResolver
		};
	}

	writeResolver(resolverName, type, model, inputSchema) {
		let args = inputSchema.args;

		args = {
			...args,
			key: {
				type: Types.String
			}
		};

		let argsObjects = Types.generateArgs(args, inputSchema.name);

		return {
			type: Types.Boolean,
			args: argsObjects,
			resolve: new Resolver(resolverName, (_, args, ctx) => {
				let session = ctx.req.session;
				let key = [model.key, args.key].join('');

				session[key] = args.value;
				return true;
			})
		};
	}

	existsResolver(resolverName, type, model, inputSchema) {
		let args = inputSchema.args;

    // check if where is not specified then generate default
		args = {
			...args,
			key: {
				type: Types.String
			}
		};

    let argsObjects = Types.generateArgs(args, inputSchema.name);

		return {
			type: Types.Boolean,
			args: argsObjects,
      resolve: new Resolver(resolverName, (_, args, ctx) => {
				let session = ctx.req.session;
				let key = [model.key, args.key].join('');

				if (key.split('.').reduce((obj, i) => obj[i], session) !== undefined) {
					return true;
				} else {
					return false;
				}
      })
		};
	}

	readResolver(resolverName, type, model, inputSchema) {
		let args = inputSchema.args;

    // check if where is not specified then generate default
		args = {
			...args,
			key: {
				type: Types.String
			}
		};

    let argsObjects = Types.generateArgs(args, inputSchema.name);

		return {
			type: type,
			args: argsObjects,
      resolve: new Resolver(resolverName, (_, args, ctx) => {
				let session = ctx.req.session;
				let key = [model.key, args.key].join('');

				return key.split('.').reduce((obj, i) => obj[i], session);
      })
		};
	}

	mutations(type, inputType, model) {
		let schema = model.schema;
		let modelName = schema.name;

		return new GraphQLObjectType({
			name: [modelName, 'Session_Mutation'].join(''),
			fields: {
				write: this.writeResolver('session.write', type, model, {
					args: {
						value: {
							type: inputType
						}
					}
				}),
				writeKV: this.writeResolver('session.writeKV', type, model, {
					args: {
						value: {
							type: Types.String
						}
					}
				})
			}
		});
	}

	queries(type, inputType, model) {
		let schema = model.schema;
		let modelName = schema.name;

		return new GraphQLObjectType({
			name: [modelName, 'Session_Query'].join(''),
			fields: {
        read: this.readResolver('session.read', type, model, {
					args: {
            key: {
							type: Types.String
						}
					}
				}),
				readKV: this.readResolver('session.readKV', Types.String, model, {
					args: {
            key: {
							type: Types.String
						},
						value: {
							type: Types.String
						}
					}
				}),
				exists: this.existsResolver('session.exists', type, model, {})
			}
		});
	}
}

export default SessionUtility;
