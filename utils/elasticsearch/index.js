import path from 'path';
import Types from '../../lib/types';
import Resolver from '../../lib/resolver';
import Elasticsearch from './elasticsearch';
import {GraphQLObjectType} from 'graphql';
import queries from '../database/queries';
import {set,map} from 'lodash'

class ElasticsearchUtility {
  constructor({config}) {
    this.client = new Elasticsearch({config});
    this.resolvers = {
      index: this
        .indexResolver
        .bind(this),
      match: this
        .matchResolver
        .bind(this),
      term: this
        .termResolver
        .bind(this),
      range: this
        .rangeResolver
        .bind(this),
      search: this
        .searchResolver
        .bind(this),
      raw: this
        .rawResolver
        .bind(this),
      bulk: this
        .bulkResolver
        .bind(this)
    };

    this.context = {
			connection: this.client
		}
  }
  queryReturnTypeGenerator(resolvedTypeName, type) {
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
    return resolvedType;
  }
  rawResolver(resolverName, type, model, inputSchema) {
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
        return client.search(modelName, args.input);
      })
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
  bulkResolver(resolverName, type, model, inputSchema) {
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

  matchResolver(resolverName, type, model, inputSchema) {
    const client = this.client;
    let args = inputSchema.args;
    let schema = model.schema;
    let modelName = schema.name;
    args = {
      ...args
    }
    let argsObjects = Types.generateArgs(args, inputSchema.name);
    const resolvedTypeName = [modelName, inputSchema.name].join('');
    const resolvedType = this.queryReturnTypeGenerator(resolvedTypeName, type);
    return {
      type: resolvedType,
      args: argsObjects,
      resolve: new Resolver(resolverName, (_, args, ctx) => {
        let newfield = [];
          map(args.input.fields, field => {
            let field_data = [field.name, field.boost].join('^')
            newfield.push(field_data);
          });
        let match = {
          query: {
            multi_match: {
              query: args.input.query,
              fields: newfield,
              fuzziness: args.input.fuzziness || 2
            }
          }
        }
        return client.search(modelName, match);
      })
    };
  }

  termResolver(resolverName, type, model, inputSchema) {
    const client = this.client;
    let args = inputSchema.args;
    let schema = model.schema;
    let modelName = schema.name;
    args = {
      ...args
    }
    let argsObjects = Types.generateArgs(args, inputSchema.name);
    const resolvedTypeName = [modelName, inputSchema.name].join('');
    const resolvedType = this.queryReturnTypeGenerator(resolvedTypeName, type);
    return {
      type: resolvedType,
      args: argsObjects,
      resolve: new Resolver(resolverName, (_, args, ctx) => {
        let term = {};
        term[args.input.field] = args.input.value;
        let match = {
          query: {
            terms: term
          }
        }
        return client.search(modelName, match);
      })
    };
  }

  rangeResolver(resolverName, type, model, inputSchema) {
    const client = this.client;
    let args = inputSchema.args;
    let schema = model.schema;
    let modelName = schema.name;
    args = {
      ...args
    }
    let argsObjects = Types.generateArgs(args, inputSchema.name);
    const resolvedTypeName = [modelName, inputSchema.name].join('');
    const resolvedType = this.queryReturnTypeGenerator(resolvedTypeName, type);
    return {
      type: resolvedType,
      args: argsObjects,
      resolve: new Resolver(resolverName, (_, args, ctx) => {
        var result = {};
        let arr = args.input;
        arr.map(itm => {
          set(result, itm.field + '.' + itm.operator, itm.value);
        });
        let match = {
          query: {
            range: result
          }
        }
        return client.search(modelName, match);
      })
    };
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
    const resolvedType = this.queryReturnTypeGenerator(resolvedTypeName, type);
    return {
      type: resolvedType,
      args: argsObjects,
      resolve: new Resolver(resolverName, (_, args, ctx) => {
        let query = [];
        let newfield = [];
        if (args.match) {
          args
            .match
            .fields
            .map(field => {
              let field_data = [field.name, field.boost].join('^')
              newfield.push(field_data);
            });
          let matchData = {
            multi_match: {
              query: args.match.query,
              fields: newfield,
              fuzziness: args.match.fuzziness || 2
            }
          };
          query.push(matchData);
        }
        if (args.range) {
          args
            .range
            .map(rangeData => {
              let data = {};
              data[rangeData.field] = {
                gte: rangeData.greaterThanEqual,
                lte: rangeData.lessThanEqual,
                boost: rangeData.boost
              };
              let ranges = {}
              ranges["range"] = data;
              query.push(ranges);
            });
        }
        if (args.term) {
          args
            .term
            .map(termData => {
              let term = {};
              let terms = {};
              term[termData.field] = termData.value;
              terms["terms"] = term;
              query.push(terms);
            })
        }
        let match = {
          query: {
            dis_max: {
              tie_breaker: args.tie_breaker || 0,
              boost: args.boost,
              queries: query
            }
          }
        }
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
        // bulk: this.bulkResolver('elasticsearch.bulkIndex', Types.Boolean, model, {
        //   args: {
        //     operation_type: {
        //       type: Types.Enum([modelName, 'operationType'].join(''), {
        //         'INDEX': {
        //           value: 'index'
        //         },
        //         'UPDATE': {
        //           value: 'update'
        //         },
        //         'DELETE': {
        //           value: 'delete'
        //         }
        //       })
        //     }
        //   }
        // })
      }
    });
  }

  queries(type, inputType, model) {
    let schema = model.schema;
    let modelName = schema.name

    const elasticQueryMatchFieldType = Types.generateInputType({
      name: [modelName, 'Elastic_Query_Field'].join(''),
      fields: {
        name: {
          type: Types.String
        },
        boost: {
          type: Types.Float
        }
      }
    });

    const matchFieldType = Types.generateInputType({
      name: [modelName, 'Elastic_Query_Match_Field'].join(''),
      fields: {
        query: {
          type: Types.String
        },
        fields: {
          type: Types.List(elasticQueryMatchFieldType)
        },
        fuzziness: {
          type: Types.Int
        }
      }
    });
    const termFieldType = Types.generateInputType({
      name: [modelName, 'Elastic_Query_Term_Field'].join(''),
      fields: {
        field: {
          type: Types.String
        },
        value: {
          type: Types.List(Types.String)
        }
      }
    });
    const rangeFieldType = Types.generateInputType({
      name: [modelName, 'Elastic_Query_Range_Field'].join(''),
      fields: {
        field: {
          type: Types.String
        },
        operator: {
          type: Types.Enum([modelName, 'operator'].join(''), {
            'GREATERTHANEQUAL': {
              value: 'gte'
            },
            'LESSTHANEQUAL': {
              value: 'lte'
            },
            'LESSTHAN': {
              value: 'lt'
            },
            'GREATERTHAN': {
              value: 'gt'
            }
          })
        },
        value: {
          type: Types.Float,
          defaultValue: 1
        }
      }
    });

    return new GraphQLObjectType({
      name: [modelName, 'Elastic_Query'].join(''),
      fields: {

        match: this.matchResolver('elasticsearch.match', type, model, {
          args: {
            input: {
              type: matchFieldType
            }
          }
        }),
        term: this.termResolver('elasticsearch.term', type, model, {
          args: {
            input: {
              type: termFieldType
            }
          }
        }),
        range: this.rangeResolver('elasticsearch.range', type, model, {
          args: {
            input: {
              type: Types.List(rangeFieldType)
            },
            boost: {
              type: Types.Float
            }
          }
        }),
        search: this.searchResolver('elasticsearch.search', type, model, {
          args: {
            range: {
              type: Types.List(rangeFieldType)
            },
            term: {
              type: Types.List(termFieldType)
            },
            match: {
              type: matchFieldType
            },
            boost: {
              type: Types.Float
            },
            tie_breaker: {
              type: Types.Float
            }
          }
        })
      }
    });
  }
}

export default ElasticsearchUtility;
