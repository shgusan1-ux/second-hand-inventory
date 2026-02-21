/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 * All rights reserved.
 * @flow
 */

'use strict';
const bizSdk = require('facebook-nodejs-business-sdk');
const AdAccount = bizSdk.AdAccount;
const Campaign = bizSdk.Campaign;

let access_token = 'EAANNickVUBEBQ4op8EL2zFNPVukYUotK3PH07cx46LFLQsSRRXFNPuqqaFpqMJ1h5XToRHOojAwM2Hx1wHQEquZBtvaSX0Ow2jyK8CZAgmn9ofOtXs5aTzEq5MJAya9b7uAemihQXRbJ8eLZBzCPGHLITyRwjGRdQ8VeyXksITfCEesndtBb7169YPX3fv7NlaDYd7r';
let app_id = '929679109607441';
let ad_account_id = 'act_2047217886202753';
let campaign_name = '';

const api = bizSdk.FacebookAdsApi.init(access_token);
const showDebugingInfo = true; // Setting this to true shows more debugging info.
if (showDebugingInfo) {
  api.setDebug(true);
}

const logApiCallResult = (apiCallName, data) => {
  console.log(apiCallName);
  if (showDebugingInfo) {
    console.log('Data:' + JSON.stringify(data));
  }
};

let fields, params;

void async function() {
  try {
    // Create an ad campaign with objective OUTCOME_TRAFFIC
    fields = [
    ];
    params = {
      'name': campaign_name,
      'objective': 'OUTCOME_TRAFFIC',
      'status': 'PAUSED',
      'special_ad_categories': [],
    };
    let campaign = await (new AdAccount(account_id)).createCampaign(
      fields,
      params
    );
    let campaign_id = campaign.id;

    console.log('Your created campaign is with campaign_id:' + campaign_id);

  } catch(error) {
    console.log(error);
    process.exit(1);
  }
}();