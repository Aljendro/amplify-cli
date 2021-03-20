import { invokeHelper } from './execute';

export const invoke = async (options: InvokeOptions): Promise<any> => {
  const { result, error } = await invokeHelper(options);
  if (error) {
    throw error;
  } else if (typeof result === 'undefined') {
    return null;
  } else {
    return result;
  }
};

export type InvokeOptions = {
  packageFolder: string;
  handler: string;
  event: string;
  context?: object;
  environment?: { [key: string]: string };
};
