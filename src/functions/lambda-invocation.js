const AWS = require("./lib/aws");
const lambda = new AWS.Lambda();
const customResource = require("./lib/custom-resource");
const schema = require("./lambda-invocation.schema");
const log = require("@dazn/lambda-powertools-logger");

const invokeFunction = async (invocation) => {
	log.debug("invoking Lambda function...", { functionName: invocation.FunctionName });
	const resp = await lambda
		.invoke({
			FunctionName: invocation.FunctionName,
			InvocationType: invocation.InvocationType,
			Payload: JSON.stringify(invocation.Payload),
			ClientContext: invocation.ClientContext,
			Qualifier: invocation.Qualifier
		})
		.promise();

	if (resp.FunctionError && invocation.Rethrow === true) {
		throw new Error(resp.FunctionError);
	}

	return invocation.FunctionName;
};

const onCreate = async invocation => {
	return await invokeFunction(invocation);
};

const onUpdate = async (_physicalResourceId, invocation) => {
	return await invokeFunction(invocation);
};

const onDelete = async physicalResourceId => physicalResourceId;

module.exports.handler = customResource(schema, onCreate, onUpdate, onDelete);
