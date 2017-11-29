import Resolver from './resolver';
import Types from './types';
import { TypeNotFoundError } from '../errors';
import { cloneDeep } from 'lodash';

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

  static get FieldDisplayType() {
    return Types.generateType({
      name: 'MetaFieldDisplay',
      fields: {
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
        }
      }
    })
  }

  static get FieldConstraintsType() {
    return Types.generateType({
      name: 'MetaFieldConstraints',
      fields: {
        type: {
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
        }
      }
    })
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
        display: {
          type: Meta.FieldDisplayType
        },
        constraints: {
          type: Meta.FieldConstraintsType
        }
      }
    })
  }

  static store(typeName, typeSchema) {

    let metaFields = [];

    // flatten all fields
    if (typeSchema.fields && typeof typeSchema.fields === 'object') {
      for(let key of Object.keys(typeSchema.fields)) {
        let metaField = {
          ...typeSchema.fields[key],
          // overrides
          name: key,
          type: typeSchema.fields[key].type.toString()
        };

        metaFields.push(metaField);
      }
    }

    let meta = {
      ...typeSchema,
      fields: metaFields
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

      if (this.metaStore[typeName]) {
        return this.metaStore[typeName];
      }

      throw new TypeNotFoundError({
        data: {
          name: typeName
        }
      });
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
