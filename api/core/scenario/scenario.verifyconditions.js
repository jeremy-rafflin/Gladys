var Promise = require('bluebird');
var queries = require('./scenario.queries.js');
var template = require('es6-template-strings');

module.exports = function(params)  {

    // we get all the State of a specific launcher
    return gladys.utils.sql(queries.getStatesLauncher, [params.launcher.id])
        .then(function(statetypes) {

            // for each state, we verify the value
            return Promise.map(statetypes, function(statetype) {
                return verify(statetype, params);
            });
        });
};


function verify(statetype, params) {

    var verifyFunction;
    
    sails.log.info(`Verifying condition "${statetype.name}" with template (${statetype.condition_template})`);

    // if it's a gladys core function
    if (gladys[statetype.service] && typeof gladys[statetype.service][statetype.function] == "function") {

        // the service is a gladys core function
        verifyFunction = gladys[statetype.service][statetype.function];
    }

    // we test if the service function exist
    if (!global[statetype.service] || typeof global[statetype.service][statetype.function] !== "function") {
        return Promise.reject(new Error(`${statetype.service}.${statetype.function} is not a function`));
    } else {

        // the service is an external service
        verifyFunction = global[statetype.service][statetype.function];
    }

    // if yes, we call the service
    return verifyFunction(params)
        .then(function(scope) {

            // when we have the result, we inject it in the condition template
            try {
                var result = template('${' + statetype.condition_template + '}', scope);
                if (result == 'true') {
                    return Promise.resolve(scope);
                } else  {

                    // condition is not verified
                    return Promise.reject(new Error('conditions_not_verified'));
                }
            } catch (e) {
                return Promise.reject(new Error(e));
            }
        });
}