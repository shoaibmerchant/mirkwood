import { GraphQLList, GraphQLInputObjectType, GraphQLObjectType, GraphQLString,
	GraphQLID, GraphQLInt, GraphQLBoolean, GraphQLObject, GraphQLSchema, GraphQLEnumType } from 'graphql';
import Meta from './meta';

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

	static Enum(name, values) {
		if (this.get(name)) {
			return this.get(name);
		}

		let generatedEnum = new GraphQLEnumType({
			name,
			values
		});

		this.store(name, generatedEnum);
		return generatedEnum;
	}

	static get OperatorType() {
		return this.Enum('Operator', {
			'EQUALS': { value: '$eq' },
			'NOTEQUALS': { value: '$ne' },
	    'GREATERTHAN': { value: '$gt' },
			'GREATERTHANEQTO': { value: '$gte' },
	    'LESSTHAN': { value: '$lt' },
			'LESSTHANEQTO': { value: '$lte' },
			'EXISTS': { value: '$exists' },
			'IN': { value: '$in' },
			'NOTIN': { value: '$nin' },
			'REGEX': { value: '$regex' },
			'LIKE': { value: '$like' }
	  });
	}

	static get SortType() {
		return this.generateInputType({
			name: 'SortType',
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

	static isOfType(typeCheck, typeName) {
		let typeCheckName = typeCheck.constructor.name;
		if (typeCheckName === typeName) {
			return true;
		}
		return false;
	}

	static isType(typeCheck) {
		let typeName = typeCheck.constructor.name;
		let graphQLTypes = ['GraphQLScalarType', 'GraphQLObjectType', 'GraphQLInputObjectType', 'GraphQLList', 'GraphQLEnumType']

		if (graphQLTypes.includes(typeName)) {
			return true;
		}
	}

	static generateArgs(args, prefix) {
		let argsObjects = {};

		for (let key of Object.keys(args)) {

			// if already type then get type instance
			if (typeof args[key].type === 'object' && args[key].type.fields) {
				args[key].type.name = args[key].name || [ prefix, key ].join('_');
			}

			argsObjects[key] = {
				...args[key],
				type: this.generateInputType(args[key].type)
			}
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

		if (typeof schema.fields === 'function') {
			resolvedModelFields = schema.fields; // do nothing
		} else {
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
		}

		let graphQLObjectSchema = {
			name: genGraphQLTypeName,
			fields: resolvedModelFields
		};

		let genGraphQLType = new GraphQLObjectType(graphQLObjectSchema);

		// Store in Stores (Type, Meta)
		Meta.store(genGraphQLTypeName, graphQLObjectSchema);
		this.store(genGraphQLTypeName, genGraphQLType);
		return genGraphQLType;
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
		if (typeof schema.fields === 'function') {
			resolvedModelFields = schema.fields; // do nothing
		} else {
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
		}

		let graphQLObjectSchema = {
			name: genGraphQLTypeName,
			fields: resolvedModelFields
		};

		let genGraphQLType = new GraphQLInputObjectType(graphQLObjectSchema);

		// Store in Stores (Type, Meta)
		Meta.store(genGraphQLTypeName, graphQLObjectSchema);
		this.store(genGraphQLTypeName, genGraphQLType);
		return genGraphQLType;
	}


	static store(typeName, type) {
		this.typeStore[typeName] = type;
		return true;
	}

	static get(typeName) {
		if (this.typeStore[typeName]) {
			return this.typeStore[typeName];
		} else {
			return false;
		}
	}

	static storeModel(model) {
		this.modelStore[model.name] = model;
		this.modelStore[model.key] = model;

		return true;
	}

	static model(modelName) {
		if (this.modelStore[modelName]) {
			return this.modelStore[modelName];
		} else {
			return false;
		}
	}

	static model(modelName) {
		if (this.modelStore[modelName]) {
			return this.modelStore[modelName];
		} else {
			return false;
		}
	}
}

Types.typeStore = {};
Types.modelStore = {};

export default Types;
