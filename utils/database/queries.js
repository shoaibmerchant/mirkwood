import { GraphQLList, GraphQLInputObjectType, GraphQLObjectType, GraphQLString,
	GraphQLID, GraphQLInt, GraphQLBoolean } from 'graphql';
import Types from '../../lib/types';
import Resolver from '../../lib/resolver';
import Database from './database';

class DatabaseQueries {

	constructor() {
	}

  resolvers() {
    return {
      one: this.oneResolver,
      all: this.allResolver
    }
  }

	generate(type, inputType, model) {
		let schema = model.schema;

		let modelDatasource = schema.datasource
		let modelName = schema.name;

		return new GraphQLObjectType({
			name: [modelName, 'Database_Query'].join(''),
			fields: {
        one: this.oneResolver('database.one', type, model, {
					args: {
            find: {
							type: inputType
						}
					}
				}),
        all: this.allResolver('database.all', type, model, {
					args: {
            find: {
              type: inputType
            }
					}
				}),
				count: this.countResolver('database.count', type, model, {
					args: {
            find: {
              type: inputType
            }
					}
				})
			}
		});
	}

  allResolver(resolverName, type, model, inputSchema) {
    let modelDatasource = model.schema.datasource;
		let args = inputSchema.args;

    args = {
      skip: {
        type: Types.Int,
        defaultValue: 0
      },
      limit: {
        type: Types.Int,
        defaultValue: 100
      },
      sort: {
        type: Types.SortType
      },
      ...args
    };

    let argsObjects = Types.generateArgs(args, inputSchema.name);

		return {
			type: Types.List(type),
			args: argsObjects,
      resolve: new Resolver(resolverName, (_, args) => {
        return Database.all(modelDatasource, args);
      })
		};
  }

	countResolver(resolverName, type, model, inputSchema) {
    let modelDatasource = model.schema.datasource;
		let args = inputSchema.args;

    args = {
      ...args
    };

    let argsObjects = Types.generateArgs(args, inputSchema.name);

		return {
			type: Types.Int,
			args: argsObjects,
      resolve: new Resolver(resolverName, (_, args) => {
        return Database.count(modelDatasource, args);
      })
		};
  }

  oneResolver(resolverName, type, model, inputSchema) {
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
			type: type,
			args: argsObjects,
      resolve: new Resolver(resolverName, (_, args) => {
        if (args._id) {
					args.find = { _id: args._id };
					delete args._id;
				}
        return Database.one(modelDatasource, args.find);
      })
		};
  }
}

export default (new DatabaseQueries());
