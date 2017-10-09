import { GraphQLList, GraphQLInputObjectType, GraphQLObjectType, GraphQLString,
	GraphQLID, GraphQLInt, GraphQLBoolean, GraphQLObject, GraphQLSchema } from 'graphql';
import { mapValues } from 'lodash';

class Types {
	static get ID() {
		return GraphQLID;
	}

	static get Int() {
		return GraphQLInt;
	}

	static get String() {
		return GraphQLString;
	}

	static get Boolean() {
		return GraphQLBoolean;
	}

	static List(dataType) {
		return new GraphQLList(dataType);
	}

	static get SortType() {
		return this.generateInputType({
			name: 'Sort',
			fields: {
				field: {
					type: GraphQLString
				},
				order: {
					type: GraphQLString,
					defaultValue: 'asc'
				}
			}
		});
	}

	static isType(typeCheck) {
		let typeName = typeCheck.constructor.name;
		let graphQLTypes = ['GraphQLScalarType', 'GraphQLObjectType', 'GraphQLInputObjectType', 'GraphQLList']

		if (graphQLTypes.includes(typeName)) {
			return true;
		}
	}

	static generateArgs(args, prefix) {
		let argsObjects = {};

		for (let key of Object.keys(args)) {

			// if already type then get type instance
			if (args[key].type) {
				argsObjects[key] = {
					...args[key],
					type: this.generateInputType(args[key].type)
				}
				continue;
			}

			let generateArg = {
				name: args[key].name || [ prefix, key ].join('_'),
				fields: args[key].fields
			};

			argsObjects[key] = {
				...args[key],
				type: Types.generateInputType(generateArg)
			};
		}

		return argsObjects;
	}

	static generateType(schema) {

		// Check if already Type is being passed
		if (this.isType(schema)) {
			return schema;
		}

		// If type already created and referenced
		if (typeof schema === 'string') {
			return this.get(schema);
		}

		// if type is specified directly as [{Schema}] or [{TypeName}]
		if (Array.isArray(schema)) {
			return new GraphQLList(this.generateType(schema[0]));
		}

		let genGraphQLTypeName = [schema.name, 'Type'].join('');
		let resolvedModelFields = {};

		// check for dupe (already generated)
		if (this.get(genGraphQLTypeName)) {
			return this.get(genGraphQLTypeName);
		}

		// flatten all types (resolve complex types recursively)
		for (let fieldKey of Object.keys(schema.fields)) {
			let field = {
				...schema.fields[fieldKey]
			}
			let fieldType = Array.isArray(field.type) ? field.type[0] : field.type;

			// find complex types
			if (typeof fieldType === 'object' && fieldType.fields) {
				fieldType.name = fieldType.name ||  [schema.name, '_', fieldKey].join('');
				fieldType = this.generateType(fieldType);
			}

			if (Array.isArray(field.type)) {
				field.type = new GraphQLList(fieldType);
			} else {
				field.type = fieldType;
			}

			resolvedModelFields[fieldKey] = field;
		}

		let genGraphQLType = new GraphQLObjectType({
			name: genGraphQLTypeName,
			fields: resolvedModelFields
		})

		this.typeStore[genGraphQLTypeName] = genGraphQLType;
		return genGraphQLType;
	}

	static get(typeName) {
		if (this.typeStore[typeName]) {
			return this.typeStore[typeName];
		} else {
			return false;
		}
	}

	static generateInputType(schema) {
		// Check if already Type is being passed
		if (this.isType(schema)) {
			return schema;
		}

		// If type already created and referenced
		if (typeof schema === 'string') {
			return this.get(schema);
		}

		// if type is specified directly as [{Schema}] or [{TypeName}]
		if (Array.isArray(schema)) {
			return new GraphQLList(this.generateInputType(schema[0]));
		}

		let genGraphQLTypeName = [schema.name, 'InputType'].join('');
		let resolvedModelFields = {};

		// check for dupe (already generated)
		if (this.get(genGraphQLTypeName)) {
			return this.get(genGraphQLTypeName);
		}

		// flatten all types (resolve complex types recursively)
		for (let fieldKey of Object.keys(schema.fields)) {
			let field = {
				...schema.fields[fieldKey]
			}
			let fieldType = Array.isArray(field.type) ? field.type[0] : field.type;

			// skip dynamic fields (that have a resolver)
			if (field.resolve) {
				continue;
			}

			// find complex types
			if (typeof fieldType === 'object' && fieldType.fields) {
				fieldType.name = fieldType.name ||  [schema.name, '_', fieldKey].join('');
				fieldType = this.generateInputType(fieldType);
			}

			if (Array.isArray(field.type)) {
				field.type = new GraphQLList(fieldType);
			} else {
				field.type = fieldType;
			}

			resolvedModelFields[fieldKey] = field;
		}

		let genGraphQLType = new GraphQLInputObjectType({
			name: genGraphQLTypeName,
			fields: resolvedModelFields
		})

		this.typeStore[genGraphQLTypeName] = genGraphQLType;

		return genGraphQLType;
	}
}

Types.typeStore = {};
export default Types;
