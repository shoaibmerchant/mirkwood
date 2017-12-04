import Resolver from './resolver';
import Types from './types';
import { TypeNotFoundError } from '../errors';
import { keys, values, map, cloneDeep } from 'lodash';

class Meta {

  static get Type() {
		return Types.generateType({
			name: 'Meta',
			fields: {
				name: {
					type: Types.String,
					required: true
				},
        fields: {
          type: [Meta.FieldType]
        }
			}
		});
	}

  static get FieldType() {
    return Types.generateType({
      name: 'MetaField',
      fields: {
        name: {
          type: Types.String,
          required: true
        },
        type: {
          type: Types.String,
          required: true
        },
        description: {
          type: Types.String
        },
        label: {
          type: Types.String
        },
        placeholder: {
          type: Types.String
        },
        precision: {
          type: Types.Int
        },
        hidden: {
          type: Types.Boolean
        },
        descriptor: {
          type: Types.String,
          defaultValue: 'text'
        },
        required: {
          type: Types.Boolean
        },
        min: {
          type: Types.Float
        },
        max: {
          type: Types.Float
        },
        step: {
          type: Types.Float
        },
        len: {
          type: Types.Int
        },
        pattern: {
          type: Types.String
        },
        unique: {
          type: Types.Boolean
        },
        keys: {
          type: [Types.String]
        },
        values: {
          type: [Types.String]
        }
      }
    })
  }


  static store(typeName, typeSchema) {
    let metaFields = [];
    let meta = {
      ...typeSchema
    };

    // flatten all fields
    if (typeSchema.fields && typeof typeSchema.fields === 'object') {
      for(let key of Object.keys(typeSchema.fields)) {
        let field = typeSchema.fields[key];
        let fieldType = field.type;

        let metaField = {
          ...field,
          // overrides
          name: key,
          type: field.type.toString()
        };

        if (Types.isOfType(fieldType, 'GraphQLEnumType')) {
          metaField.values = keys(this.metaStore[fieldType]);
          metaField.keys = values(this.metaStore[fieldType]).map(valueObj => valueObj.value);
          metaField.type = 'Enum';
        }

        metaFields.push(metaField);
      }

      meta.fields = metaFields
    }

		this.metaStore[typeName] = meta;
		return true;
	}

	static get(typeName) {
		if (this.metaStore[typeName]) {
			return this.metaStore[typeName];
		} else {
			return false;
		}
	}

  static resolver() {
    return new Resolver('meta.type', (_, args, ctx) => {
      let typeName = args.name;

      if (!this.metaStore[typeName]) {
        throw new TypeNotFoundError({
          data: {
            name: typeName
          }
        });
      }

      return this.metaStore[typeName];
    });
  }

  static generateRootMetaType() {
    return Types.generateType({
			name: 'RootMeta',
			fields: {
				type: {
					type: Meta.Type,
					args: {
						name: {
							type: Types.String
						}
					},
					resolve: Meta.resolver()
				}
			}
		});
  }
}

Meta.metaStore = {};
export default Meta;
