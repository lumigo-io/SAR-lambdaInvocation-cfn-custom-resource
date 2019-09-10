const Joi = require("@hapi/joi");

const LambdaInvocation = Joi.object().keys({
	FunctionName: Joi.string().required(),
	Qualifier: Joi.string(),
	ClientContext: Joi.string(),
	InvocationType: Joi.string().valid("Event", "RequestResponse").default("RequestResponse"),
	Payload: Joi.object(),
	Rethrow: Joi.bool().when("InvocationType", {
		is: "RequestResponse",
		then: Joi.valid(true, false).default(true),
		otherwise: Joi.valid(null)
	})
});

module.exports = LambdaInvocation;
