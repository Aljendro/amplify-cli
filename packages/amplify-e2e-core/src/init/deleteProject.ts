import { nspawn as spawn, retry } from '../../src';
import { getCLIPath, describeCloudFormationStack, getConfigFromProfile, getProjectMeta } from '../../src';

export const deleteProject = async (cwd: string, profileConfig?: any) => {
  const { StackName: stackName, Region: region } = getProjectMeta(cwd).providers.awscloudformation;
  if(!profileConfig){
    profileConfig = getConfigFromProfile();
    profileConfig.region = region;
  }
  await retry(
    () => describeCloudFormationStack(stackName, region, profileConfig),
    stack => stack.StackStatus.endsWith('_COMPLETE'),
  );
  return new Promise((resolve, reject) => {
    const noOutputTimeout = 1000 * 60 * 20; // 20 minutes;
    spawn(getCLIPath(), ['delete'], { cwd, stripColors: true, noOutputTimeout })
      .wait('Are you sure you want to continue?')
      .sendLine('y')
      .wait('Project deleted locally.')
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
};
