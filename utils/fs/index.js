import { GraphQLObjectType } from 'graphql';
import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import Types from '../../lib/types';
import Resolver from '../../lib/resolver';

class FsUtility {

	constructor() {
		this.resolvers = {
			access: this.accessResolver,
			exists: this.existsResolver,
			read: this.readResolver,
			write: this.writeResolver,
			mkdir: this.mkdirResolver
		};
	}

	writeResolver(resolverName, type, model, inputSchema) {
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
				type: Types.String,
				required: true
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
						fs.writeFile(filepath, data, (err) => {
	            if (err) {
	              reject(false);
	            } else {
	              resolve(true);
	            }
	          });
          });
        });
			})
		};
	}


	mkdirResolver(resolverName, type, model, inputSchema) {
		let args = inputSchema.args;

		args = {
			cwd: {
				type: Types.String,
				defaultValue: 'tmp'
			},
			dir: {
				type: Types.String,
				required: true
			},
			mode: {
				type: Types.String,
				defaultValue: '0777'
			},
			...args
		};

		let argsObjects = Types.generateArgs(args, inputSchema.name);

		return {
			type: type || Types.Boolean,
			args: argsObjects,
			resolve: new Resolver(resolverName, (_, args, ctx) => {
				let dirpath = path.resolve(args.cwd, args.dir);
				let mode = args.mode;

				return new Promise((resolve, reject) => {
          mkdirp(dirpath, { mode: mode }, (err) => {
            if (err) {
              reject(false);
            } else {
              resolve(true);
            }
          });
        });
			})
		};
	}

	accessResolver(resolverName, type, model, inputSchema) {
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
      mode: {
        type: Types.String,
        defaultValue: 'r'
      },
			...args
		};

    let argsObjects = Types.generateArgs(args, inputSchema.name);

		return {
			type: type || Types.Boolean,
			args: argsObjects,
      resolve: new Resolver(resolverName, (_, args, ctx) => {
				let filepath = path.resolve(args.dir, args.filename);
        let mode = args.mode;
        switch(mode) {
          case 'r':
            mode = fs.constants.R_OK;
            break;
          case 'rw':
            mode = fs.constants.R_OK | fs.constants.W_OK;
            break;
          case 'rwx':
            mode = fs.constants.R_OK | fs.constants.W_OK | fs.constants.X_OK;
            break;
          default:
            mode = fs.constants.R_OK;
        }

        return new Promise((resolve, reject) => {
          fs.access(filepath, mode, (err) => {
            if (err) {
              reject(false);
            } else {
              resolve(true);
            }
          });
        })
      })
		};
	}

	existsResolver(resolverName, type, model, inputSchema) {
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
			...args
		};

    let argsObjects = Types.generateArgs(args, inputSchema.name);

		return {
			type: type || Types.Boolean,
			args: argsObjects,
      resolve: new Resolver(resolverName, (_, args, ctx) => {
				let filepath = path.resolve(args.dir, args.filename);

        return new Promise((resolve, reject) => {
          fs.access(filepath, fs.constants.F_OK, (err) => {
            if (err) {
							if (err.code === 'ENOENT') {
								resolve(false);
							}
              reject(false);
            } else {
              resolve(true);
            }
          });
        })
      })
		};
	}

	readResolver(resolverName, type, model, inputSchema) {
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
			...args
		};

    let argsObjects = Types.generateArgs(args, inputSchema.name);

		return {
			type: type || Types.String,
			args: argsObjects,
      resolve: new Resolver(resolverName, (_, args, ctx) => {
        let filepath = path.resolve(args.dir, args.filename);

        return new Promise((resolve, reject) => {
          fs.readFile(filepath, (err, res) => {
            if (err) {
              reject(err);
            } else {
              resolve(res);
            }
          });
        })
      })
		};
	}

	mutations(type, inputType, model) {
		let schema = model.schema;
		let modelName = schema.name;

		return new GraphQLObjectType({
			name: [modelName, 'FS_Mutation'].join(''),
			fields: {
				write: this.writeResolver('fs.write', Types.Boolean, model, {
					args: {}
				}),
				mkdir: this.mkdirResolver('fs.mkdir', Types.Boolean, model, {
					args: {}
				})
			}
		});
	}

	queries(type, inputType, model) {
		let schema = model.schema;
		let modelName = schema.name;

		return new GraphQLObjectType({
			name: [modelName, 'FS_Query'].join(''),
			fields: {
        read: this.readResolver('fs.read', Types.String, model, {
					args: {}
				}),
				access: this.accessResolver('fs.access', Types.Boolean, model, {
					args: {}
				}),
				exists: this.existsResolver('fs.exists', Types.Boolean, model, {
					args: {}
				})
			}
		});
	}
}

export default FsUtility;
