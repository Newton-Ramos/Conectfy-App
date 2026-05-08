import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

const UFS = new Set([
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]);

export function IsUF(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsUF',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;
          return UFS.has(value.trim().toUpperCase());
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} inválido`;
        },
      },
    });
  };
}

