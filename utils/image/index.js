import { GraphQLObjectType } from 'graphql';
import fs from 'fs';
import path from 'path';
import gm from 'gm';
import Types from '../../lib/types';
import Resolver from '../../lib/resolver';

class ImageUtility {

	constructor() {
		this.resolvers = {

		};
	}

	editResolver(resolverName, type, model, inputSchema) {
		let args = inputSchema.args;

		args = {
			cwd: {
				type: Types.String,
				defaultValue: 'tmp'
			},
			src: {
				type: Types.String,
				required: true
			},
      dest: {
				type: Types.String,
				required: true
			},
      options: {
        name: 'ImageEdit_Options',
        type: {
          fields: {
            resize: {
              type: {
                name: 'ImageEdit_Options_Resize',
                fields: {
                  height: {
                    type: Types.Int
                  },
                  width: {
                    type: Types.Int
                  }
                }
              }
            },
            background: {
              type: Types.String
            },
            extent: {
              type: {
                name: 'ImageEdit_Options_Extent',
                fields: {
                  height: {
                    type: Types.Int
                  },
                  width: {
                    type: Types.Int
                  }
                }
              }
            },
            position: {
              type: Types.Enum('ImageEdit_Options_Positions', {
                NORTH_WEST: { value: 'NorthWest'},
                NORTH: { value: 'North' },
                WEST: { value: 'West' },
                CENTER: { value: 'Center' },
                EAST: { value: 'East' },
                SOUTH_WEST: { value: 'SouthWest' },
                SOUTH: { value: 'South' },
                SOUTH_EAST: { value: 'SouthEast' }
              })
            }
          }
        }
      },
			...args
		};

		let argsObjects = Types.generateArgs(args, inputSchema.name);

		return {
			type: type || Types.Boolean,
			args: argsObjects,
			resolve: new Resolver(resolverName, (_, args, ctx) => {
        let srcPath = path.resolve(args.cwd, args.src);
        let destPath = path.resolve(args.cwd, args.dest);
        let options = args.options;

        let img = gm(srcPath);

        // resize image
        if (options.resize) {
          img = img.resize(options.resize.width, options.resize.height);
        }

        // add background
        if (options.background) {
          img = img.background(options.background);
        }

        // set gravity
        if (options.position) {
          img = img.gravity(options.position);
        }

        // extent image
        if (options.extent) {
          img = img.extent(options.extent.width, options.extent.height);
        }

        // remove no profile
        img.noProfile();

        return new Promise((resolve, reject) => {
          img.write(destPath, (err, res) => {
            if (err) {
              reject(err);
              return;
            }
            resolve(true);
          })
        });
			})
		};
	}

	mutations(type, inputType, model) {
		let schema = model.schema;
		let modelName = schema.name;

		return new GraphQLObjectType({
			name: [modelName, 'Image_Mutation'].join(''),
			fields: {
				edit: this.editResolver('image.edit', Types.Boolean, model, { args: {} })
			}
		});
	}

	queries(type, inputType, model) {
		let schema = model.schema;
		let modelName = schema.name;

    return false;
	}
}

export default ImageUtility;
