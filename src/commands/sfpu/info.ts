/*
 * Copyright (c) 2022, cjbradshaw
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as os from 'os';
import { flags, SfdxCommand } from '@salesforce/command';
import { Messages, SfError } from '@salesforce/core';
import { getPackageInfo, Package2Info } from "../../helpers/package";

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfpu', 'info');

export default class Info extends SfdxCommand {
  
  public static description = messages.getMessage('commandDescription');

  public static examples = messages.getMessage('examples').split(os.EOL);

  public static args = [{ name: 'file' }];

  protected static flagsConfig = {
    // flag with a value (-n, --name=VALUE)
    name: flags.string({
      char: 'n',
      description: messages.getMessage('nameFlagDescription'),required: false
    }),
    versionnumber: flags.string({
      char: 'm',
      description: messages.getMessage('versionNumberFlagDescription')
    }),
    allbetas: flags.boolean({
      char: 'b',
      description: messages.getMessage('allBetasFlagDescription')
    }),    
    versionid: flags.string({
      char: 'i', 
      description: messages.getMessage('versionIdByFlagDescription')})
  };

  //protected static supportsDevhubUsername = true;
  protected static requiresDevhubUsername = true;

  protected static requiresProject = false;

  public async run(): Promise<Package2Info[]> {
    //const name = (this.flags.name || 'world') as string;

    // this.org is guaranteed because requiresUsername=true, as opposed to supportsUsername
    const conn = this.hubOrg.getConnection();
    const pkgVersionid = this.flags.versionid;
    let pkgname = '';
    let pkgVersionNumber = '';
    let vers = [];
    let allBetaVersions: boolean = false;
    let progressMsg = '';
    if (pkgVersionid != null) {
      progressMsg+='fetching with pacakge Id: ' + pkgVersionid;
    }else{
      pkgname = this.flags.name;
      pkgVersionNumber = this.flags.versionnumber;
      vers = pkgVersionNumber.split('.');
      allBetaVersions = this.flags.allbetas;
      //console.log('allBetaVersions='+allBetaVersions);
      this.validateVersionNumber(pkgname, vers);
      progressMsg = 'fetching with package name : ' + pkgname + ' and version: ' + pkgVersionNumber;
      if(allBetaVersions){
        progressMsg+='. will fetch all beta versions';
      }
      this.ux.startSpinner(progressMsg);

    }
    

    


    let result = await getPackageInfo(conn,pkgname,pkgVersionNumber,pkgVersionid,allBetaVersions);
    //console.log(result);
    if (!result || result.length <= 0) {
      throw new SfError(messages.getMessage('errorNoOrgResults', [pkgname,pkgVersionNumber]));
    }
    this.ux.stopSpinner();
    //const latestPkg = result[0];
    
    this.ux.table(result,['SubscriberPackageVersionId','PackageVersionNumber','CodeCoverage','Tag','IsReleased','CreatedDate']);    
    
    return result;
  }

  private validateVersionNumber(packageName, versionParts) {
    if (!(versionParts.length > 1)) {
        throw new SfError(
            `Invalid dependency version number ${versionParts.join(
                '.'
            )} for package ${packageName}. Valid format is 1.0.0.1 (or) 1.0.0.LATEST`
        );
    } else if (versionParts.length === 4 && versionParts[3] === 'NEXT') {
        throw new SfError(
            `Invalid dependency version number ${versionParts.join(
                '.'
            )} for package ${packageName}, NEXT is not allowed. Valid format is 1.0.0.1 (or) 1.0.0.LATEST`
        );
    }
}


}
