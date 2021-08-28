import { Exclude, Expose, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsOptional,
  IsString,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { HttpStatus } from '../../enums';
import { UnprocessableEntityException } from '../../exceptions';
import { ArgumentMetadata } from '../../interfaces';
import { ValidationPipe } from '../../pipes/validation.pipe';

@Exclude()
class TestModelInternal {
  constructor() {}
  @Expose()
  @IsString()
  public prop1: string;

  @Expose()
  @IsString()
  public prop2: string;

  @Expose({ groups: ['internal'] })
  @IsString()
  @IsOptional()
  public propInternal: string;
}

class TestModel {
  @IsString()
  public prop1: string;

  @IsString()
  public prop2: string;

  @IsOptional()
  @IsString()
  public optionalProp: string;
}

class TestModelNoValidaton {
  constructor() {}

  public prop1: string;
  public prop2: string;
  public optionalProp: string;
}

describe('ValidationPipe', () => {
  let target: ValidationPipe;
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: TestModel,
    data: '',
  };
  const transformMetadata: ArgumentMetadata = {
    type: 'body',
    metatype: TestModelInternal,
    data: '',
  };

  describe('transform', () => {
    describe('when validation passes', () => {
      beforeEach(() => {
        target = new ValidationPipe();
      });
      it('should return the value unchanged if optional value is not defined', async () => {
        const testObj = { prop1: 'value1', prop2: 'value2' };
        expect(await target.transform(testObj, {} as any)).toEqual(testObj);
        expect(
          await target.transform(testObj, metadata as any),
        ).not.toBeInstanceOf(TestModel);
      });
      it('should return the value unchanged if optional value is set undefined', async () => {
        const testObj = {
          prop1: 'value1',
          prop2: 'value2',
          optionalProp: undefined,
        };
        expect(await target.transform(testObj, {} as any)).toEqual(testObj);
        expect(
          await target.transform(testObj, metadata as any),
        ).not.toBeInstanceOf(TestModel);
      });
      it('should return the value unchanged if optional value is null', async () => {
        const testObj = {
          prop1: 'value1',
          prop2: 'value2',
          optionalProp: null,
        };
        expect(await target.transform(testObj, {} as any)).toEqual(testObj);
        expect(
          await target.transform(testObj, metadata as any),
        ).not.toBeInstanceOf(TestModel);
      });
      it('should return the value unchanged if optional value is set', async () => {
        const testObj = {
          prop1: 'value1',
          prop2: 'value2',
          optionalProp: 'optional value',
        };
        expect(await target.transform(testObj, {} as any)).toEqual(testObj);
        expect(
          await target.transform(testObj, metadata as any),
        ).not.toBeInstanceOf(TestModel);
      });
    });
    describe('when validation fails', () => {
      beforeEach(() => {
        target = new ValidationPipe();
      });
      it('should throw an error', async () => {
        const testObj = { prop1: 'value1' };
        return expect(target.transform(testObj, metadata)).rejects.toThrow();
      });

      class TestModel2 {
        @IsString()
        public prop1: string;

        @IsBoolean()
        public prop2: string;

        @IsOptional()
        @IsString()
        public optionalProp: string;
      }
      class TestModelWithNested {
        @IsString()
        prop: string;

        @IsDefined()
        @Type(() => TestModel2)
        @ValidateNested()
        test: TestModel2;
      }
      it('should flatten nested errors', async () => {
        try {
          const model = new TestModelWithNested();
          model.test = new TestModel2();
          await target.transform(model, {
            type: 'body',
            metatype: TestModelWithNested,
          });
        } catch (err) {
          expect(err.getResponse().message).toEqual([
            'prop must be a string',
            'test.prop1 must be a string',
            'test.prop2 must be a boolean value',
          ]);
        }
      });

      class TestModelForNestedArrayValidation {
        @IsString()
        public prop: string;

        @IsArray()
        @ValidateNested()
        @Type(() => TestModel2)
        public test: TestModel2[];
      }
      it('should provide complete path for nested errors', async () => {
        try {
          const model = new TestModelForNestedArrayValidation();
          model.test = [new TestModel2()];
          await target.transform(model, {
            type: 'body',
            metatype: TestModelForNestedArrayValidation,
          });
        } catch (err) {
          expect(err.getResponse().message).toEqual([
            'prop must be a string',
            'test.0.prop1 must be a string',
            'test.0.prop2 must be a boolean value',
          ]);
        }
      });
    });
    describe('when validation transforms', () => {
      it('should return a TestModel instance', async () => {
        target = new ValidationPipe({ transform: true });
        const testObj = { prop1: 'value1', prop2: 'value2', prop3: 'value3' };
        expect(await target.transform(testObj, metadata)).toBeInstanceOf(
          TestModel,
        );
      });
      describe('when input is a query parameter (number)', () => {
        it('should parse to number', async () => {
          target = new ValidationPipe({ transform: true });
          const value = '3.14';

          expect(
            await target.transform(value, {
              metatype: Number,
              data: 'test',
              type: 'query',
            }),
          ).toEqual(+value);
        });
      });
      describe('when input is a path parameter (number)', () => {
        it('should parse to number', async () => {
          target = new ValidationPipe({ transform: true });
          const value = '3.14';

          expect(
            await target.transform(value, {
              metatype: Number,
              data: 'test',
              type: 'param',
            }),
          ).toEqual(+value);
        });
      });
      describe('when input is a query parameter (boolean)', () => {
        it('should parse to boolean', async () => {
          target = new ValidationPipe({ transform: true });
          const value = 'true';

          expect(
            await target.transform(value, {
              metatype: Boolean,
              data: 'test',
              type: 'query',
            }),
          ).toBeTruthy();
        });
      });
      describe('when input is a path parameter (boolean)', () => {
        it('should parse to boolean', async () => {
          target = new ValidationPipe({ transform: true });
          const value = 'true';

          expect(
            await target.transform(value, {
              metatype: Boolean,
              data: 'test',
              type: 'param',
            }),
          ).toBeTruthy();
        });
      });
      describe('when validation strips', () => {
        it('should return a TestModel without extra properties', async () => {
          target = new ValidationPipe({ whitelist: true });
          const testObj = { prop1: 'value1', prop2: 'value2', prop3: 'value3' };
          expect(await target.transform(testObj, metadata)).not.toBeInstanceOf(
            TestModel,
          );
          expect(await target.transform(testObj, metadata)).not.toEqual(
            expect.objectContaining({ prop3: expect.any(String) }),
          );
        });
      });
      describe('when validation rejects', () => {
        it('should throw an error', () => {
          target = new ValidationPipe({
            forbidNonWhitelisted: true,
            whitelist: true,
          });
          const testObj = { prop1: 'value1', prop2: 'value2', prop3: 'value3' };
          expect(target.transform(testObj, metadata)).rejects.toThrow();
        });
      });
      describe('when transformation is internal', () => {
        it('should return a TestModel with internal property', async () => {
          target = new ValidationPipe({
            transform: true,
            transformOptions: { groups: ['internal'] },
          });
          const testObj = {
            prop1: 'value1',
            prop2: 'value2',
            propInternal: 'value3',
          };
          expect(
            await target.transform(testObj, transformMetadata),
          ).toEqual(
            expect.objectContaining({ propInternal: expect.any(String) }),
          );
        });
      });
      describe('when transformation is external', () => {
        it('should return a TestModel without internal property', async () => {
          target = new ValidationPipe({
            transform: true,
            transformOptions: { groups: ['external'] },
          });
          const testObj = {
            prop1: 'value1',
            prop2: 'value2',
            propInternal: 'value3',
          };
          expect(
            await target.transform(testObj, transformMetadata),
          ).not.toEqual(
            expect.objectContaining({ propInternal: expect.any(String) }),
          );
        });
      });
    });
    describe('when validation does not transform', () => {
      describe('when validation strips', () => {
        it('should return a plain object without extra properties', async () => {
          target = new ValidationPipe({ transform: false, whitelist: true });
          const testObj = { prop1: 'value1', prop2: 'value2', prop3: 'value3' };
          const result = await target.transform(testObj, metadata);

          expect(result).not.toBeInstanceOf(TestModel);
          expect(result).not.toEqual(
            expect.objectContaining({ prop3: expect.any(String) }),
          );
          expect(result).not.toEqual(
            expect.objectContaining({ optionalProp: expect.any(String) }),
          );
        });
        it('should return a plain object without extra properties if optional prop is defined', async () => {
          target = new ValidationPipe({ transform: false, whitelist: true });
          const testObj = {
            prop1: 'value1',
            prop2: 'value2',
            prop3: 'value3',
            optionalProp: 'optional value',
          };
          const result = await target.transform(testObj, metadata);
          expect(result).not.toBeInstanceOf(TestModel);
          expect(result).not.toEqual(
            expect.objectContaining({ prop3: expect.any(String) }),
          );
          expect(result).toEqual(
            expect.objectContaining({ optionalProp: expect.any(String) }),
          );
        });
        it('should return a plain object without extra properties if optional prop is undefined', async () => {
          target = new ValidationPipe({ transform: false, whitelist: true });
          const testObj = {
            prop1: 'value1',
            prop2: 'value2',
            prop3: 'value3',
            optionalProp: undefined,
          };
          const result = await target.transform(testObj, metadata);
          expect(result).not.toBeInstanceOf(TestModel);
          expect(result).not.toEqual(
            expect.objectContaining({ prop3: expect.any(String) }),
          );
          expect(result).not.toEqual(
            expect.objectContaining({ optionalProp: expect.any(String) }),
          );
        });
        it('should return a plain object without extra properties if optional prop is null', async () => {
          target = new ValidationPipe({ transform: false, whitelist: true });
          const testObj = {
            prop1: 'value1',
            prop2: 'value2',
            prop3: 'value3',
            optionalProp: null,
          };

          const result = await target.transform(testObj, metadata);
          expect(result).not.toBeInstanceOf(TestModel);
          expect(result).not.toEqual(
            expect.objectContaining({ prop3: expect.any(String) }),
          );
          expect(result).not.toEqual(
            expect.objectContaining({ optionalProp: expect.any(String) }),
          );
        });
      });
      describe('when validation rejects', () => {
        it('should throw an error', () => {
          target = new ValidationPipe({
            transform: false,
            forbidNonWhitelisted: true,
            whitelist: true,
          });
          const testObj = { prop1: 'value1', prop2: 'value2', prop3: 'value3' };
          expect(target.transform(testObj, metadata)).rejects.toThrow();
        });
      });
    });
    describe('when type doesnt match', () => {
      describe('when validation rules are applied', () => {
        it('should throw an error', async () => {
          target = new ValidationPipe();
          const testObj = [
            { prop1: 'value1', prop2: 'value2', prop3: 'value3' },
          ];

          expect(target.transform(testObj, metadata)).rejects.toThrow();
          expect(target.transform('string', metadata)).rejects.toThrow();
          expect(target.transform(true, metadata)).rejects.toThrow();
          expect(target.transform(3, metadata)).rejects.toThrow();
        });
      });
      describe('otherwise', () => {
        it('should not reject', async () => {
          target = new ValidationPipe();
          const testObj = [
            { prop1: 'value1', prop2: 'value2', prop3: 'value3' },
          ];

          const objMetadata = { ...metadata, metatype: TestModelNoValidaton };
          const result = await target.transform(testObj, objMetadata);

          expect(result).not.toBeInstanceOf(TestModel);
          expect(result).toEqual(testObj);

          // primitives
          expect(await target.transform('string', objMetadata)).toEqual(
            'string',
          );
          expect(await target.transform(3, objMetadata)).toEqual(3);
          expect(await target.transform(true, objMetadata)).toEqual(true);
        });
      });
    });
  });

  describe('option: "errorHttpStatusCode"', () => {
    describe('when validation fails', () => {
      beforeEach(() => {
        target = new ValidationPipe({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        });
      });
      it('should throw an error', async () => {
        const testObj = { prop1: 'value1' };
        try {
          await target.transform(testObj, metadata);
        } catch (err) {
          expect(err).toBeInstanceOf(UnprocessableEntityException);
        }
      });
    });
  });

  describe('option: "expectedType"', () => {
    class TestModel2 {
      @IsString()
      public prop1: string;

      @IsBoolean()
      public prop2: boolean;

      @IsOptional()
      @IsString()
      public optionalProp: string;
    }

    it('should validate against the expected type if presented', async () => {
      const m: ArgumentMetadata = {
        type: 'body',
        metatype: TestModel2,
        data: '',
      };

      target = new ValidationPipe({ expectedType: TestModel });
      const testObj = { prop1: 'value1', prop2: 'value2' };

      expect(await target.transform(testObj, m)).toEqual(testObj);
    });

    it('should validate against the expected type if presented and metatype is primitive type', async () => {
      const m: ArgumentMetadata = {
        type: 'body',
        metatype: String,
        data: '',
      };

      target = new ValidationPipe({ expectedType: TestModel });
      const testObj = { prop1: 'value1', prop2: 'value2' };

      expect(await target.transform(testObj, m)).toEqual(testObj);
    });
  });
});
