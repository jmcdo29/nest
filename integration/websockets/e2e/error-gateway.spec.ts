import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { io } from 'socket.io-client';
import { ErrorGateway } from '../src/error.gateway';

describe('ErrorGateway', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      providers: [ErrorGateway],
    }).compile();
    app = await testingModule.createNestApplication();
    await app.listen(3000);
  });

  it(`should handle error`, async () => {
    const ws = io('http://localhost:8080');
    ws.emit('push', {
      test: 'test',
    });
    await new Promise<void>(resolve =>
      ws.on('exception', data => {
        expect(data).toEqual({
          status: 'error',
          message: 'test',
        });
        resolve();
      }),
    );
    ws.close();
  });

  afterEach(async () => app.close());
});
