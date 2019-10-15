const AWS = require("./lib/aws");
const lambda = new AWS.Lambda();
const customResource = require("./lib/custom-resource");
const schema = require("./lambda-invocation.schema");
const log = require("@dazn/lambda-powertools-logger");

const invokeFunction = async invocation => {
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

const shouldInvoke = (event, invocation) => {
	if (invocation.When === "All") {
		return true;
	} else if (invocation.When === event) {
		return true;
	} else if (Array.isArray(invocation.When) && invocation.When.includes(event)) {
		return true;
	} else {
		return false;
	}
};

const onEvent = async (event, invocation) => {
	if (shouldInvoke(event, invocation)) {
		return await invokeFunction(invocation);
	} else {
		return invocation.FunctionName;
	}
};

const onCreate = async invocation => await onEvent("Create", invocation);

const onUpdate = async (_id, invocation) => await onEvent("Update", invocation);

const onDelete = async (_id, invocation) => await onEvent("Delete", invocation);

module.exports.handler = customResource(schema, onCreate, onUpdate, onDelete);
