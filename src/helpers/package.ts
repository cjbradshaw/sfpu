/*
 * Copyright (c) 2022, cjbradshaw
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 * ------------------------------------------------------------------------------------------------------------
 * model interface and helper methods for packaging
 */
import { Connection } from '@salesforce/core';


/**
 * 
 * @param connection - sfdx connection
 * @param pkgname - e.g. salesforce-global-core
 * @param version - the symantic version e.g. 1.1.0.1
 * @param pkgId - if provided it will just fetch info for the package
 * @param allBetas - if supplied then it will show the list of packages in that group - e.g. 1.1.0.1, 1.1.0.2,1.1.0.3 - otherwise just the specific version
 * @returns 
 */
export async function getPackageInfo(connection: Connection, pkgname: string, version:string, pkgId: string, allBetas:boolean):Promise<Package2Info[]>{
    const vers = version.split('.');
    
    let query = 'SELECT SubscriberPackageVersionId,MajorVersion,MinorVersion,PatchVersion,BuildNumber,Description,Name,Tag,CreatedDate,LastModifiedDate,ValidationSkipped,ReleaseVersion,IsReleased,CodeCoverage,HasPassedCodeCoverageCheck FROM Package2Version ';
    if (pkgId) {
      query+=` WHERE SubscriberPackageVersionId = \'${pkgId}\'`
    }else{
        if(allBetas){ 
            //console.log('allBetas='+allBetas);
            query+=` WHERE Package2.Name = \'${pkgname}\' AND MajorVersion=${vers[0]} and MinorVersion=${vers[1]} and PatchVersion=${vers[2]} ORDER by BuildNumber desc`;
        }else{
            query+=` WHERE Package2.Name = \'${pkgname}\' AND MajorVersion=${vers[0]} and MinorVersion=${vers[1]} and PatchVersion=${vers[2]} and BuildNumber=${vers[3]}`;
        }
        
    }
    
    let response = await connection.tooling.query(query);
    let pkdDetails = [];
    //map to the interface
    if (response.records && response.records.length > 0) {
        response.records.forEach((record) => {
            const pkg = {} as Package2Info;
            pkg.SubscriberPackageVersionId = record.SubscriberPackageVersionId;
            pkg.MajorVersion = record.MajorVersion;
            pkg.MinorVersion = record.MinorVersion;
            pkg.PatchVersion = record.PatchVersion;
            pkg.BuildNumber = record.BuildNumber;
            pkg.CodeCoverage = record.CodeCoverage ? record.CodeCoverage.apexCodeCoveragePercentage : 0;
            pkg.CodeCoverageCheckPassed = record.HasPassedCodeCoverageCheck;
            pkg.PackageVersionNumber = `${record.MajorVersion}.${record.MinorVersion}.${record.PatchVersion}.${record.BuildNumber}`
            pkg.ValidationSkipped = record.ValidationSkipped;
            pkg.Name = record.Name;
            pkg.Tag = record.Tag;
            pkg.CreatedDate = record.CreatedDate;
            pkg.LastModifiedDate = record.LastModifiedDate;
            pkg.IsReleased = record.IsReleased;
            pkdDetails.push(pkg);
        });
    }
    return pkdDetails;
}

export async function getLatestPackageVersion(connection: Connection, pkgname: string, releasedOnly:boolean):Promise<Package2Info[]>{
    
    let query = `SELECT SubscriberPackageVersionId,MajorVersion,MinorVersion,PatchVersion,BuildNumber,Description,Name,Tag,CreatedDate,LastModifiedDate,ValidationSkipped,ReleaseVersion,IsReleased,CodeCoverage,HasPassedCodeCoverageCheck FROM Package2Version WHERE Package2.Name = \'${pkgname}\'`;
    if (releasedOnly) {
      query+= ' AND IsReleased = true '
    }
    query+='ORDER By CreatedDate DESC';
    
    let response = await connection.tooling.query(query);
    let pkdDetails = [];
    //map to the interface
    if (response.records && response.records.length > 0) {
        response.records.forEach((record) => {
            const pkg = {} as Package2Info;
            pkg.SubscriberPackageVersionId = record.SubscriberPackageVersionId;
            pkg.MajorVersion = record.MajorVersion;
            pkg.MinorVersion = record.MinorVersion;
            pkg.PatchVersion = record.PatchVersion;
            pkg.BuildNumber = record.BuildNumber;
            pkg.CodeCoverage = record.CodeCoverage ? record.CodeCoverage.apexCodeCoveragePercentage : 0;
            pkg.CodeCoverageCheckPassed = record.HasPassedCodeCoverageCheck;
            pkg.PackageVersionNumber = `${record.MajorVersion}.${record.MinorVersion}.${record.PatchVersion}.${record.BuildNumber}`
            pkg.ValidationSkipped = record.ValidationSkipped;
            pkg.Name = record.Name;
            pkg.Tag = record.Tag;
            pkg.LastModifiedDate = record.LastModifiedDate;
            pkg.CreatedDate = record.CreatedDate;
            pkg.IsReleased = record.IsReleased;
            pkdDetails.push(pkg);
        });
    }
    return pkdDetails;
}



// The type we are querying for
export interface Package2Info {
    SubscriberPackageVersionId: string;
    PackageVersionNumber: string;
    MajorVersion: number;
    MinorVersion: number;
    PatchVersion: number;
    BuildNumber: number;
    Description: string;
    ValidationSkipped: string;
    Name: string;
    Tag: string;
    CreatedDate: Date;
    LastModifiedDate: Date;
    IsReleased: Boolean;
    CodeCoverage: number;
    CodeCoverageCheckPassed: boolean;    
}

