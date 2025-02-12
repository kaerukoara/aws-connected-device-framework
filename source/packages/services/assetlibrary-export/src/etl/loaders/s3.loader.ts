/*********************************************************************************************************************
 *  Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/
import { inject, injectable } from 'inversify';
import moment from 'moment';
import * as _ from 'lodash';

import { TYPES } from '../../di/types';
import { logger } from '../../utils/logger';

import { Loader, Loaded } from '../load.service';
import { Transformed } from '../transform.service';

@injectable()
export class S3Loader implements Loader {

    private s3: AWS.S3;

    constructor(
        @inject(TYPES.S3Factory) s3Factory: () => AWS.S3,
        @inject('defaults.etl.load.path') private loadPath: string,
        @inject('aws.s3.export.bucket') private exportBucket: string,
        @inject('aws.s3.export.prefix') private exportKeyPrefix: string,
    ) {
        this.s3 = s3Factory();
    }

    public async load(batch: Transformed): Promise<Loaded> {
        logger.debug(`S3Loader: load: in: ${JSON.stringify(batch)}`);

        const compiled = _.template(this.loadPath);
        const compiledKey = compiled({
            moment,
            batch,
            aws: {
                s3: {
                    export: {
                        bucket: this.exportBucket,
                        prefix: this.exportKeyPrefix,
                    }
                }
            }
        });

        const params:AWS.S3.PutObjectRequest = {
            Bucket: this.exportBucket,
            Key: compiledKey,
            Body: JSON.stringify(batch.items),
            ContentType: 'application/json',
        };

        const result = await this.s3.putObject(params).promise();

        logger.debug(`S3Loader: load: out: ${JSON.stringify(result)}`);

        return {
            batchId: batch.id,
            exportBucket: this.exportBucket,
            exportKey: compiledKey
        };

    }
}
