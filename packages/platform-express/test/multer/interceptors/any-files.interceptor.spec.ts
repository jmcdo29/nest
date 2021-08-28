import { CallHandler } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { of } from 'rxjs';
import * as sinon from 'sinon';
import { AnyFilesInterceptor } from '../../../multer/interceptors/any-files.interceptor';

describe('FilesInterceptor', () => {
  it('should return metatype with expected structure', async () => {
    const targetClass = AnyFilesInterceptor();
    expect(targetClass.prototype.intercept).not.toBeUndefined();;
  });
  describe('intercept', () => {
    let handler: CallHandler;
    beforeEach(() => {
      handler = {
        handle: () => of('test'),
      };
    });
    it('should call any() with expected params', async () => {
      const target = new (AnyFilesInterceptor())();

      const callback = (req, res, next) => next();
      const arraySpy = sinon
        .stub((target as any).multer, 'any')
        .returns(callback);

      await target.intercept(new ExecutionContextHost([]), handler);

      expect(arraySpy.called).toBeTruthy()
      expect(arraySpy.calledWith()).toBeTruthy();
    });
    it('should transform exception', async () => {
      const target = new (AnyFilesInterceptor())();
      const err = {};
      const callback = (req, res, next) => next(err);
      (target as any).multer = {
        any: () => callback,
      };
      (target.intercept(new ExecutionContextHost([]), handler) as any).catch(
        error => expect(error).not.toBeUndefined()
      );
    });
  });
});
