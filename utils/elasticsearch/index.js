import path from 'path';
import Types from '../../lib/types';
import Resolver from '../../lib/resolver';
import Elasticsearch from './elasticsearch';
import {GraphQLObjectType} from 'graphql';

class ElasticsearchUtility {
  constructor({config}) {
    this.client = new Elasticsearch({config});
    this.resolvers = {
      index: this
        .indexResolver
        .bind(this),
      query: this
        .searchResolver
        .bind(this)
    };
  }

  indexResolver(resolverName, type, model, inputSchema) {
    const client = this.client;
    let args = inputSchema.args;
    let schema = model.schema;
    let modelName = schema.name;
    args = {
      ...args
    };

    let argsObjects = Types.generateArgs(args, inputSchema.name);
    return {
      type: Types.Boolean,
      args: argsObjects,
      resolve: new Resolver(resolverName, (_, args, ctx) => {
        return client.index(modelName, args._id, args.input);
      })
    };
  }

  generateMatchType(model) {
		let schema = model.schema;
		let modelName = schema.name;

		let matchTypeName = [modelName, 'Match'].join('_');

		// fetch if exists
		if (Types.get(matchTypeName)) {
			return Types.get(matchTypeName);
		}

		return Types.generateInputType({
		  name: matchTypeName,
		  fields: schema.fields
		}, ['defaultValue']); // sp that defaultValue is filtered out
  }
  
  searchResolver(resolverName, type, model, inputSchema) {
    const client = this.client;
    let args = inputSchema.args;
    let schema = model.schema;
    let modelName = schema.name;
    args = {
      ...args
    }
    let argsObjects = Types.generateArgs(args, inputSchema.name);

    const resolvedTypeName = [modelName, inputSchema.name].join('');

    const resolvedType = Types.generateType({
      name: [resolvedTypeName, 'Elastic_Search'].join(''),
      fields: {
        total: {
          type: Types.Int
        },
        maxScore: {
          type: Types.Float
        },
        hits: {
          type: Types.List(Types.generateType({
            name: [resolvedTypeName, 'Elastic_Search_Hit'].join(''),
            fields: {
              _id: {
                type: Types.ID
              },
              source: {
                type: type
              },
              score: {
                type: Types.Float
              }
            }
          }))
        }
      }
    });

    return {
      type: resolvedType,
      args: argsObjects,
      resolve: new Resolver(resolverName, (_, args, ctx) => {
        let match = {
          query: {
            match: args.match
          }
        }
        console.log("match",match);
        return client.search(modelName, match);
      })
    };
  }

  mutations(type, inputType, model) {
    let schema = model.schema;
    let modelName = schema.name;
    return new GraphQLObjectType({
      name: [modelName, 'Elastic_Mutation'].join(''),
      fields: {
        index: this.indexResolver('elasticsearch.index', Types.Boolean, model, {
          args: {
            _id: {
              type: Types.ID
            },
            input: {
              type: inputType
            }
          }
        })
      }
    });
  }

  queries(type, inputType, model) {
    let schema = model.schema;
    let modelName = schema.name
    return new GraphQLObjectType({
      name: [modelName, 'Elastic_Query'].join(''),
      fields: {
        search: this.searchResolver('elasticsearch.search', type, model, {
          args: {
            match: {
              type: this.generateMatchType(model)
            }
          }
        })
      }
    });
  }
}

export default ElasticsearchUtility;
