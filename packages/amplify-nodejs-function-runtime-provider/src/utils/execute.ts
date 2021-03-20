import { existsSync } from 'fs-extra';
import { InvokeOptions } from './invoke';
import path from 'path';

export const invokeHelper = async (options: InvokeOptions): Promise<{ result?: any; error?: any }> => {
  try {
    const result = await invokeFunction(options);
    return { result };
  } catch (error) {
    let plainError = error;
    if (typeof error === 'object') {
      plainError = Object.getOwnPropertyNames(error).reduce((acc, key) => {
        acc[key] = error[key];
        return acc;
      }, {} as Record<string, any>);
    }
    return { error: plainError };
  }
};

const invokeFunction = async (options: InvokeOptions) => {
  if (options.packageFolder) {
    const p = path.resolve(options.packageFolder);
    if (!existsSync(p)) {
      throw new Error(`Lambda package folder ${options.packageFolder} does not exist`);
    }
    process.chdir(p);
  } else {
    throw new Error(`Invalid lambda invoke request. No package folder specified.`);
  }
  if (!options.handler) {
    throw new Error('Invalid lambda invoke request. No handler specified.');
  }

  const lambdaHandler = await loadHandler(options.packageFolder, options.handler);
  const event = JSON.parse(options.event);

  const lambdaMockContext = {
    functionName: 'mock-function-name',
    functionVersion: '1',
    invokedFunctionArn: 'mock-function-arn',
    memoryLimitInMB: '128',
    awsRequestId: 'LAMBDA_INVOKE',
    logGroupName: 'LAMBDA_INVOKE',
    logStreamName: 'LAMBDA_INVOKE',
    callbackWaitsForEmptyEventLoop: true,
    ...options.context,
  };

  return new Promise(async (resolve, reject) => {
    const callback = (error: any, response: any) => {
      if (error) {
        reject(error);
      } else {
        resolve(response);
      }
    };
    try {
      const lambdaPromise = lambdaHandler(event, lambdaMockContext, callback);
      if (typeof lambdaPromise === 'object' && typeof lambdaPromise.then === 'function') {
        resolve(await lambdaPromise);
      }
    } catch (e) {
      reject(e);
    }
  });
};

// handler is a string like 'path/to/handler.func'
const loadHandler = async (root: string, handler: string): Promise<Function> => {
  const handlerParts = path.parse(handler);
  try {
    const handler = await import(path.join(root, handlerParts.dir, handlerParts.name));
    const handlerFuncName = handlerParts.ext.replace('.', '');
    const handlerFunc = handler?.[handlerFuncName];
    if (typeof handlerFunc !== 'function') {
      throw new Error(`Lambda handler ${handlerParts.name} has no exported function named ${handlerFuncName}`);
    }
    return handlerFunc;
  } catch (err) {
    throw new Error(`Could not load lambda handler function due to ${err}`);
  }
};
