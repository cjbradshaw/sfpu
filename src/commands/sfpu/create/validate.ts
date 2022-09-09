/*
 * Copyright (c) 2022 cjbradshaw
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 * ------------------------------------------------------------------------------------------------------------
 * performs validation checks prior to creating a package.
 * 1 - checks that the project package dependencies are the latest version in the devhub
 * 2 - checks if the commit # has been used before
 * 3 - checks that there isn't a released version of this main version 
 */
import * as os from 'os';
import { flags, SfdxCommand } from '@salesforce/command';
import { Messages,SfError } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import { getLatestPackageVersion, getPackageInfo } from "../../../helpers/package";

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfpu', 'createvalidate');

export default class Validate extends SfdxCommand {
  
  public static description = messages.getMessage('commandDescription');

  public static examples = messages.getMessage('examples').split(os.EOL);

  public static args = [{ name: 'file' }];

  protected static flagsConfig = {
    latest: flags.boolean({
        char: 'l', 
        description: messages.getMessage('latestFlagDescription')}),    
    tag: flags.string({
        char: 't', 
        description: messages.getMessage('commitTagFlagDescription')}),
    released: flags.boolean({
        char: 'r',
        description: messages.getMessage('releasedFlagDescription')
    })
    };

  // Comment this out if your command does not require an org username
  //protected static requiresUsername = true;

  // Comment this out if your command does not support a hub org username
  protected static requiresDevhubUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = true;

  public async run(): Promise<AnyJson> {
    //const projectJson = await this.project.retrieveSfProjectJson();
    const commitCheck = this.flags.tag;
    const promotedCheck = this.flags.released;
    const checkLatest = this.flags.latest;

    const defaultPkg = await this.project.getDefaultPackage();
    console.log('defaultPkg => ' + defaultPkg.name);
    const conn = this.hubOrg.getConnection();
    
    const pkgDirectories = await this.project.getSfProjectJson().getPackageDirectoriesSync();


    let pkgsToCheck = [];
    pkgDirectories.forEach((namedDir) =>{
        let deps = namedDir.dependencies;
        if(deps){
            deps.forEach((dep) => {
                const pkg = {} as PkgDep;
                const depPackageName = dep.package;
                const depPackageVersion = dep.versionNumber;
                this.ux.log('Dep check : ' + depPackageName + ' version : ' + depPackageVersion);
                pkg.Name = depPackageName;
                pkg.Version = depPackageVersion;
                pkg.vers = depPackageVersion.split('.');
                pkgsToCheck.push(pkg);
            });
            
        }
        
    });
    await this.getPkgInfo(conn,pkgsToCheck);
    if(promotedCheck != null){
        this.checkReleased(conn,pkgsToCheck);
    }      
    for (const dep of pkgsToCheck) {
        if(checkLatest != null){
            if(!dep.latest){
                throw new SfError(messages.getMessage('errorUpdateDependency', [dep.Name,dep.Version]));
            }    
        }
        //check the commit
        if(commitCheck != null){
            if(dep.Tag == commitCheck){
                throw new SfError(messages.getMessage('errorTagAlreadyPackaged', [commitCheck]));
            }
        }
        if(dep.versionReleased){
            throw new SfError(messages.getMessage('errorAlreadyPromoted', [dep.Version]));
        }
     
    }

    return 'Valid';
  }

  private async checkReleased(conn,dependencies:PkgDep[]){
    for (const dep of dependencies) {
        let result = await getPackageInfo(conn,dep.Name,dep.Version,null,true);
        result.forEach((pkg) => {
            if(pkg.IsReleased){
                dep.versionReleased;
            }
        });
    }
  }
  
  private async getPkgInfo(conn,dependencies:PkgDep[]){
    for (const dep of dependencies) {
        let result = await getLatestPackageVersion(conn,dep.Name,false);
        
        if (!result) {
            throw new SfError(messages.getMessage('errorNoOrgResults', [dep.Name]));
        }else{
            const pkg = result[0];
            dep.Tag = pkg.Tag;
            //check that the major , minor and patch versions align
            if(pkg.MajorVersion.toString() == dep.vers[0] && pkg.MinorVersion.toString() == dep.vers[1] && pkg.PatchVersion.toString() == dep.vers[2]){
                dep.latest = true;
            }else{
                dep.latest = false;
                this.ux.log(messages.getMessage('errorDepNotLatest',[dep.Name,dep.Version,pkg.PackageVersionNumber]));
            }
            
        }
    } 
  }

  

}

interface PkgDep {
    Name: string;
    Version: string;
    vers: string[];
    latest: Boolean;
    Tag: string;
    versionReleased:boolean
}