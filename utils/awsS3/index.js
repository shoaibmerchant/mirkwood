import { GraphQLObjectType } from 'graphql';
import fs from 'fs';
import path from 'path';
import mime from 'mime';
import AWS from 'aws-sdk';
import Types from '../../lib/types';
import Resolver from '../../lib/resolver';

class AWSS3Utility {

	constructor({ config }) {
		this.resolvers = {

		};

		let envConfig = config[process.env['NODE_ENV'] || 'development'];

		// update AWS credentials
		AWS.config.update({
			accessKeyId: envConfig.key,
			secretAccessKey: envConfig.secret
		});

		// Create bucket instance
		if (envConfig.bucket && envConfig.bucket.name) {
			this.s3bucket = new AWS.S3({ params: { Bucket: envConfig.bucket.name } });
		}
	}

	putResolver(resolverName, type, model, inputSchema) {
		let s3bucket = this.s3bucket;
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
			acl: {
				type: Types.String,
				defaultValue: 'public-read'
			},
			...args
		};

		let argsObjects = Types.generateArgs(args, inputSchema.name);

		return {
			type: type || Types.Boolean,
			args: argsObjects,
			resolve: new Resolver(resolverName, (_, args, ctx) => {
				let srcPath = path.resolve(args.cwd, args.src);
				let dest = args.dest;
				return new Promise((resolve, reject) => {

					fs.readFile(srcPath, (err, res) => {
						if (err) {
							reject(err);
							return;
						}

						let data = {
							// Bucket: sails.config.globals.awsBucketName,
		          Key: dest,
		          ACL: args.acl,
		          Body: res,
		          ContentType: mime.getType(srcPath)
						};
						s3bucket.putObject(data, (err, res) => {
							if (err) {
								reject(err);
								return;
							}

							resolve(true);
						})
					})
        });
			})
		};
	}

	mutations(type, inputType, model) {
		let schema = model.schema;
		let modelName = schema.name;

		return new GraphQLObjectType({
			name: [modelName, 'AWSS3_Mutation'].join(''),
			fields: {
				upload: this.putResolver('awsS3.upload', Types.Boolean, model, { args: {} })
			}
		});
	}

	queries(type, inputType, model) {
    return false;
	}
}

export default AWSS3Utility;
