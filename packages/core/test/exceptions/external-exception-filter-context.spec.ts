import * as sinon from 'sinon';
import { Catch } from '../../../common/decorators/core/catch.decorator';
import { UseFilters } from '../../../common/decorators/core/exception-filters.decorator';
import { ApplicationConfig } from '../../application-config';
import { ExternalExceptionFilterContext } from '../../exceptions/external-exception-filter-context';
import { NestContainer } from '../../injector/container';
import { InstanceWrapper } from '../../injector/instance-wrapper';

describe('ExternalExceptionFilterContext', () => {
  let applicationConfig: ApplicationConfig;
  let exceptionFilter: ExternalExceptionFilterContext;

  class CustomException {}
  @Catch(CustomException)
  class ExceptionFilter {
    public catch(exc, res) {}
  }

  beforeEach(() => {
    applicationConfig = new ApplicationConfig();
    exceptionFilter = new ExternalExceptionFilterContext(
      new NestContainer(),
      applicationConfig,
    );
  });
  describe('create', () => {
    describe('when filters metadata is empty', () => {
      class EmptyMetadata {}
      beforeEach(() => {
        sinon.stub(exceptionFilter, 'createContext').returns([]);
      });
      it('should return plain ExceptionHandler object', () => {
        const filter = exceptionFilter.create(
          new EmptyMetadata(),
          () => ({} as any),
          undefined,
        );
        expect((filter as any).filters).toEqual([]);
      });
    });
    describe('when filters metadata is not empty', () => {
      @UseFilters(new ExceptionFilter())
      class WithMetadata {}

      it('should return ExceptionHandler object with exception filters', () => {
        const filter = exceptionFilter.create(
          new WithMetadata(),
          () => ({} as any),
          undefined,
        );
        expect((filter as any).filters).not.toEqual([]);
      });
    });
  });
  describe('reflectCatchExceptions', () => {
    it('should return FILTER_CATCH_EXCEPTIONS metadata', () => {
      expect(
        exceptionFilter.reflectCatchExceptions(new ExceptionFilter()),
      ).toEqual([CustomException]);
    });
  });
  describe('createConcreteContext', () => {
    class InvalidFilter {}
    const filters = [new ExceptionFilter(), new InvalidFilter(), 'test'];

    it('should return expected exception filters metadata', () => {
      const resolved = exceptionFilter.createConcreteContext(filters as any);
      expect(resolved.length).toBe(1);
      expect(resolved[0].exceptionMetatypes).toEqual([CustomException]);
      expect(typeof resolved[0].func).toBe('function');
    });
  });

  describe('getGlobalMetadata', () => {
    describe('when contextId is static and inquirerId is nil', () => {
      it('should return global filters', () => {
        const expectedResult = applicationConfig.getGlobalFilters();
        expect(exceptionFilter.getGlobalMetadata()).toEqual(expectedResult);
      });
    });
    describe('otherwise', () => {
      it('should merge static global with request/transient scoped filters', () => {
        const globalFilters: any[] = ['test'];
        const instanceWrapper = new InstanceWrapper();
        const instance = 'request-scoped';
        const scopedFilterWrappers = [instanceWrapper];

        sinon
          .stub(applicationConfig, 'getGlobalFilters')
          .callsFake(() => globalFilters);
        sinon
          .stub(applicationConfig, 'getGlobalRequestFilters')
          .callsFake(() => scopedFilterWrappers);
        sinon
          .stub(instanceWrapper, 'getInstanceByContextId')
          .callsFake(() => ({ instance } as any));

        expect(exceptionFilter.getGlobalMetadata({ id: 3 })).toEqual(
          expect.arrayContaining([instance, ...globalFilters]),
        );
      });
    });
  });
});
