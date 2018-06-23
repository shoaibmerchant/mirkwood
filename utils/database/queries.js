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
      all: this.allResolver,
			joinMany: this.joinManyResolver,
			joinOne: this.joinOneResolver
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
							type: Database.generateFindType(model)
						},
						query: {
							type: DatabaseQueries.generateQueryType(type, model)
						}
					}
				}),
        all: this.allResolver('database.all', type, model, {
					args: {
            find: {
							type: Database.generateFindType(model)
            },
						query: {
							type: DatabaseQueries.generateQueryType(type, model)
						}
					}
				}),
				count: this.countResolver('database.count', type, model, {
					args: {
            find: {
							type: Database.generateFindType(model)
            },
						query: {
							type: DatabaseQueries.generateQueryType(type, model)
						}
					}
				})
			}
		});
	}

	static generateQueryFieldsSchema(schema, typeName) {
		let queryFieldSchema = {};

		for (let key of Object.keys(schema.fields)) {
			let field = schema.fields[key];
			let fieldType = field.type;

			if (field.resolve) {
				continue;
			}

			let queryFieldsTypeFieldsName = [typeName, key].join('_')

			if (typeof fieldType === 'object' && fieldType.fields) {
				queryFieldSchema[key] = {
					type: Types.generateInputType({
						name: queryFieldsTypeFieldsName,
						fields: DatabaseQueries.generateQueryFieldsSchema(fieldType, queryFieldsTypeFieldsName)
					})
				};
				continue;
			}

			if (Array.isArray(fieldType) && fieldType[0].fields) {
				queryFieldSchema[key] = {
					type: Types.generateInputType({
						name: queryFieldsTypeFieldsName,
						fields: DatabaseQueries.generateQueryFieldsSchema(fieldType[0], queryFieldsTypeFieldsName)
					})
				};
				continue;
			}

			queryFieldSchema[key] = {
				type: Types.generateInputType({
					name: queryFieldsTypeFieldsName,
					fields: {
						operator: {
							type: Types.OperatorType,
							required: true
						},
						value: {
							type: field.type
						},
						values: {
							type: Types.generateInputType([field.type]),
							defaultValue: []
						},
						options: {
							type: {
								name: [queryFieldsTypeFieldsName, 'options'].join('_'),
								fields: {
									match: {
										type: Types.String,
										description: "Specifiy additional options to pass for regular expression matching"
									}
								}
							}
						}
					}
				})
			};
		}
		return queryFieldSchema;
	}

	static generateQueryFieldsType(type, model) {
		let schema = model.schema;

		let modelDatasource = schema.datasource
		let modelName = schema.name;

		let queryFieldsTypeName = [modelName, 'Fields'].join('_');

		let queryFieldsTypeFields = DatabaseQueries.generateQueryFieldsSchema(schema, queryFieldsTypeName);

		return Types.generateInputType({
		  name: queryFieldsTypeName,
		  fields: queryFieldsTypeFields
		});
	}

	static generateQueryType(type, model) {
		let schema = model.schema;

		let modelDatasource = schema.datasource
		let modelName = schema.name;

		let queryTypeName = [modelName, 'QueryType'].join('_');

		// fetch if exists
		if (Types.get(queryTypeName)) {
			return Types.get(queryTypeName);
		}

		let queryType = new GraphQLInputObjectType({
		  name: queryTypeName,
		  fields: () => ({
				fields: {
					type: DatabaseQueries.generateQueryFieldsType(type, model)
				},
		    and: {
		      type: new GraphQLList(queryType)
		    },
				or: {
		      type: new GraphQLList(queryType)
		    },
				not: {
					type: new GraphQLList(queryType)
				}
		  })
		});

		// store for future refs
		Types.store(queryTypeName, queryType);
		return queryType;
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
			distinct: {
				type: [Types.String]
			},
      sort: {
        type: Types.SortType
      },
			aggregate: {
				type: Types.AggregateType
			},
			orderBy: {
        type: [Types.SortType]
      },
			groupBy: {
				type: [Types.GroupByType]
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

	joinManyResolver(resolverName, type, model, inputSchema) {
		let args = inputSchema.args;
		let modelDatasource = model.schema.datasource;

    args = {
			skip: {
        type: Types.Int,
        defaultValue: 0
      },
      limit: {
        type: Types.Int,
        defaultValue: 100
      },
			find: {
				type: Database.generateFindType(model)
			},
			query: {
				type: DatabaseQueries.generateQueryType(type, model)
			},
      sort: {
        type: Types.SortType
      },
			orderBy: {
        type: [Types.SortType]
      },
			...args
    };

    let argsObjects = Types.generateArgs(args, inputSchema.name);

		return {
			type: Types.List(type),
			args: argsObjects,
      resolve: new Resolver(resolverName, (obj, args) => {
				let field = args.field;
				let joinBy = args.joinBy;
				let joinValue = obj[joinBy];

				let dbArgs = {
					skip: args.skip,
					limit: args.limit,
					sort: args.sort,
					orderBy: args.orderBy,
					find: args.find || {},
					query: args.query,
				};

				if (joinValue === null) {
					return Promise.resolve(null)
				}

				// add join condition
				if (Array.isArray(joinValue)) {
					dbArgs.find[field] = joinValue;
				} else {
					dbArgs.find[field] = joinValue.toString();
				}

				return Database.all(modelDatasource, dbArgs);
      })
		};
  }

	joinOneResolver(resolverName, type, model, inputSchema) {
		let args = inputSchema.args;
		let modelDatasource = model.schema.datasource;

    args = {
			find: {
				type: Database.generateFindType(model)
			},
			query: {
				type: DatabaseQueries.generateQueryType(type, model)
			},
			...args
    };

    let argsObjects = Types.generateArgs(args, inputSchema.name);

		return {
			type: type,
			args: argsObjects,
      resolve: new Resolver(resolverName, (obj, args) => {
				let field = args.field;
				let joinBy = args.joinBy;
				let joinValue = obj[joinBy];

				let find = args.find || {};
				let query = args.query || {};

				if (joinValue === null) {
					return Promise.resolve(null)
				}

				find[field] = joinValue.toString();

				return Database.one(modelDatasource, { find, query });
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

		args = {
			...args,
			aggregate: {
				type: Types.AggregateType
			}
		}
    // check if where find is not specified then generate default
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
      resolve: new Resolver(resolverName, (_, resolverArgs) => {
				const transformedArgs = resolverArgs;
        if (args._id) {
					args.find = { _id: args._id };
				}

				const { find, query, aggregate } = transformedArgs;

        return Database.one(modelDatasource, { find, query, aggregate });
      })
		};
  }
}

export default (new DatabaseQueries());
