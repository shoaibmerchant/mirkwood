import path from 'path';
import Types from '../../lib/types';
import Resolver from '../../lib/resolver';
import { GraphQLObjectType } from 'graphql';
import queries from '../database/queries';
import {set,map} from 'lodash'

import Queue from './queue';

class QueueUtility {
  constructor({config}) {
    //Passing config to the Queue Utility
    Queue.init({ config });

    this.resolvers = {
      push: this.pushResolver.bind(this),
      clean: this.cleanResolver.bind(this)
    };
  }

  pushResolver(resolverName, type, model, inputSchema) {
    
    let schemaArgs = inputSchema.args ;
    let schema = model.schema;
    let modelName = schema.name;

    schemaArgs = {
      data: {
        type: Types.String,
        required: true
      },
      // ...schemaArgs,
      queue: {
        type: Types.String,
        required: true        
      },
      jobType: {
        type: Types.String
      },
      options: {
        type: {
          name: "QueueOptions",
          fields: {
            jobId: {
              type: Types.String
            },
            attempts: {
              type: Types.Int,
              defaultValue: 3
            },
            lifo: {
              type: Types.Boolean
            },
            priority: {
              type: Types.Int,
              defaultValue: 1
            },
            delay: {
              type: Types.Int,
              defaultValue: 0
            },
            removeOnComplete: {
              type: Types.Boolean,
              defaultValue: false
            },
            removeOnFail: {
              type: Types.Boolean,
              defaultValue: false
            },
            backoff: {
              type: {
                name: "RetryOptions",
                fields: {
                  type: {
                    type: Types.String
                  },
                  delay: {
                    type: Types.Int
                  }
                }
              }
            }
          }
        }
      }
    };

    let argsObjects = Types.generateArgs(schemaArgs, inputSchema.name);

    const resolvedType = Types.generateType({
      name: "QueueCreated",
      fields: {
        id: {
          type: Types.ID
        },
        data: {
          type: Types.String
        }
      }
    });

    return {
      type: resolvedType,
      args: argsObjects,
      resolve: new Resolver(resolverName, (_, args, ctx) => {
        return Queue.push(model, args);
      })
    };
    
  }

  cleanResolver(resolverName, type, model, inputSchema) {
    let schemaArgs = inputSchema.args ;
    let schema = model.schema;
    let modelName = schema.name;

    schemaArgs = {
      queue: {
        type: Types.String,
        required: true
      },
      type: {
        type: Types.Enum('QueueType', {
          'active': { value: 'active' },
          'delayed': { value: 'delayed' },
          'wait': { value: 'wait' },
          'completed': { value: 'completed' },
          'failed': { value: 'failed' }
        }),
        defaultValue: 'active'
      },
      grace: {
        type: Types.Int,
        defaultValue: 0
      }
    };

    let argsObjects = Types.generateArgs(schemaArgs, inputSchema.name);

    return {
      type: Types.Boolean,
      args: argsObjects,
      resolve: new Resolver(resolverName, (_, args, ctx) => {
        return Queue.clean(model, args);
      })
    };
  }

  mutations(type, inputType, model) {
    return null;
  }

  queries(type, inputType, model) {
    return null;
  }
}

export default QueueUtility;