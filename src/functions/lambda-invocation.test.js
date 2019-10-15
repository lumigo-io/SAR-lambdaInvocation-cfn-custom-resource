const _ = require("lodash");
const AWS = require("./lib/aws");
const https = require("https");

const mockInvoke = jest.fn();
AWS.Lambda.prototype.invoke = mockInvoke;

const mockRequest = jest.fn();
https.request = mockRequest;

console.log = jest.fn();

beforeEach(() => {
	mockInvoke.mockReturnValueOnce({
		promise: () => Promise.resolve({})
	});

	// eslint-disable-next-line no-unused-vars
	mockRequest.mockImplementation((_options, cb) => {
		return {
			// eslint-disable-next-line no-unused-vars
			on: () => {},
			write: () => {},
			end: () => cb({ on: (_status, cb2) => cb2() })
		};
	});
});

afterEach(() => {
	mockInvoke.mockClear();
});

describe("schema validation", () => {
	const defaultEvent = {
		ResourceType: "Custom::LambdaInvocation",
		RequestType: "Create",
		PhysicalResourceId: "1234",
		ResponseURL: "https://theburningmonk.com",
		ResourceProperties: {
			ServiceToken: "test-token"
		}
	};

	const genEvent = props => _.merge(_.cloneDeep(defaultEvent), { ResourceProperties: props });

	test("FunctionName is required", async () => {
		const handler = require("./lambda-invocation").handler;
		await handler(genEvent());

		expect(mockInvoke).not.toBeCalled();
		thenResponseUrlIsCalled();
	});

	test("Payload is JSON serialized", async () => {
		const handler = require("./lambda-invocation").handler;
		await handler(
			genEvent({
				FunctionName: "my-function",
				InvocationType: "RequestResponse",
				Payload: { Foo: "Bar" }
			})
		);

		thenLambdaIsInvokedWith("my-function", {
			InvocationType: "RequestResponse",
			Payload: '{"Foo":"Bar"}'
		});
		thenResponseUrlIsCalled();
	});

	test("InvocationType defaults to RequestResponse", async () => {
		const handler = require("./lambda-invocation").handler;
		await handler(
			genEvent({
				FunctionName: "my-function"
			})
		);

		thenLambdaIsInvokedWith("my-function", {
			InvocationType: "RequestResponse"
		});
		thenResponseUrlIsCalled();
	});

	test("InvocationType can also be 'Event'", async () => {
		const handler = require("./lambda-invocation").handler;
		await handler(
			genEvent({
				FunctionName: "my-function",
				InvocationType: "Event"
			})
		);

		thenLambdaIsInvokedWith("my-function", {
			InvocationType: "Event"
		});
		thenResponseUrlIsCalled();
	});

	test("InvocationType can only be 'Event' or 'RequestResponse'", async () => {
		const handler = require("./lambda-invocation").handler;
		await handler(
			genEvent({
				FunctionName: "my-function",
				InvocationType: "DryRun"
			})
		);

		expect(mockInvoke).not.toBeCalled();
		thenResponseUrlIsCalled();
	});

	test("ClientContext is passed to the invocation", async () => {
		const handler = require("./lambda-invocation").handler;
		await handler(
			genEvent({
				FunctionName: "my-function",
				ClientContext: "foo"
			})
		);

		thenLambdaIsInvokedWith("my-function", {
			InvocationType: "RequestResponse",
			ClientContext: "foo"
		});
		thenResponseUrlIsCalled();
	});

	test("Qualifier is passed to the invocation", async () => {
		const handler = require("./lambda-invocation").handler;
		await handler(
			genEvent({
				FunctionName: "my-function",
				Qualifier: "alias"
			})
		);

		thenLambdaIsInvokedWith("my-function", {
			InvocationType: "RequestResponse",
			Qualifier: "alias"
		});
		thenResponseUrlIsCalled();
	});

	test("Rethrow is allowed when InvocationType is 'RequestResponse'", async () => {
		const handler = require("./lambda-invocation").handler;
		await handler(
			genEvent({
				FunctionName: "my-function",
				Rethrow: true
			})
		);

		thenLambdaIsInvokedWith("my-function", {
			InvocationType: "RequestResponse"
		});
		thenResponseUrlIsCalled();
	});

	test("Rethrow is not allowed when InvocationType is not 'RequestResponse'", async () => {
		const handler = require("./lambda-invocation").handler;
		await handler(
			genEvent({
				FunctionName: "my-function",
				InvocationType: "Event",
				Rethrow: true
			})
		);

		expect(mockInvoke).not.toBeCalled();
		thenResponseUrlIsCalled();
	});  
});

describe("lambda-invocation", () => {
	test("Create events would trigger Lambda invocation", async () => {
		const handler = require("./lambda-invocation").handler;
		await handler(genEvent("Create", "my-function"));

		thenLambdaIsInvoked("my-function");
		thenResponseUrlIsCalled();
	});

	test("Update events would trigger Lambda invocation", async () => {
		const handler = require("./lambda-invocation").handler;
		await handler(genEvent("Update", "my-function"));

		thenLambdaIsInvoked("my-function");
		thenResponseUrlIsCalled();
	});

	test("Delete events would not trigger Lambda invocation", async () => {
		const handler = require("./lambda-invocation").handler;
		await handler(genEvent("Delete", "my-function"));

		expect(mockInvoke).not.toBeCalled();
		thenResponseUrlIsCalled();
	});

	test("Should error for unsupported events", async () => {
		const handler = require("./lambda-invocation").handler;
		await expect(handler(genEvent("Dance", "my-function"))).rejects.toEqual(
			new Error("unexpected RequestType [Dance]")
		);
	});

	test("Should rethrow errors if Rethrow is true", async () => {
		const handler = require("./lambda-invocation").handler;
		const event = {
			ResourceType: "Custom::LambdaInvocation",
			RequestType: "Create",
			PhysicalResourceId: "1234",
			ResponseURL: "https://theburningmonk.com",
			ResourceProperties: {
				ServiceToken: "test-token",
				FunctionName: "my-function",
				Rethrow: true
			}
		};

		mockInvoke.mockReset();
		mockInvoke.mockReturnValueOnce({
			promise: () => Promise.reject(new Error("boom"))
		});
		await expect(handler(event)).rejects.toEqual(new Error("boom"));

		thenResponseUrlIsCalled();
	});

	test("Should swallow errors if Rethrow is false", async () => {
		const handler = require("./lambda-invocation").handler;
		const event = {
			ResourceType: "Custom::LambdaInvocation",
			RequestType: "Create",
			PhysicalResourceId: "1234",
			ResponseURL: "https://theburningmonk.com",
			ResourceProperties: {
				ServiceToken: "test-token",
				FunctionName: "my-function",
				Rethrow: false
			}
		};

		mockInvoke.mockReset();
		mockInvoke.mockReturnValueOnce({
			promise: () => Promise.reject(new Error("boom"))
		});
		await expect(handler(event)).resolves;

		thenResponseUrlIsCalled();
	});
  
	test("Should invoke on delete if When is All", async () => {
		const handler = require("./lambda-invocation").handler;
		const event = {
			ResourceType: "Custom::LambdaInvocation",
			RequestType: "Delete",
			PhysicalResourceId: "1234",
			ResponseURL: "https://theburningmonk.com",
			ResourceProperties: {
				ServiceToken: "test-token",
				FunctionName: "my-function",
				When: "All"
			}
		};

		await handler(event);

		expect(mockInvoke).toBeCalled();
		thenResponseUrlIsCalled();
	});
  
	test("Should invoke on delete if When is Delete", async () => {
		const handler = require("./lambda-invocation").handler;
		const event = {
			ResourceType: "Custom::LambdaInvocation",
			RequestType: "Delete",
			PhysicalResourceId: "1234",
			ResponseURL: "https://theburningmonk.com",
			ResourceProperties: {
				ServiceToken: "test-token",
				FunctionName: "my-function",
				When: "Delete"
			}
		};

		await handler(event);

		expect(mockInvoke).toBeCalled();
		thenResponseUrlIsCalled();
	});
  
	test("Should invoke on delete if When is an array containing Delete", async () => {
		const handler = require("./lambda-invocation").handler;
		const event = {
			ResourceType: "Custom::LambdaInvocation",
			RequestType: "Delete",
			PhysicalResourceId: "1234",
			ResponseURL: "https://theburningmonk.com",
			ResourceProperties: {
				ServiceToken: "test-token",
				FunctionName: "my-function",
				When: ["Delete"]
			}
		};

		await handler(event);

		expect(mockInvoke).toBeCalled();
		thenResponseUrlIsCalled();
	});
});

function genEvent(reqType, functionName, payload = {}) {
	return {
		ResourceType: "Custom::LambdaInvocation",
		RequestType: reqType,
		PhysicalResourceId: "1234",
		ResponseURL: "https://theburningmonk.com",
		ResourceProperties: {
			ServiceToken: "test-token",
			FunctionName: `arn:aws:lambda:us-east-1:374852340823:function:${functionName}`,
			Payload: payload
		}
	};
}

function thenLambdaIsInvoked(functionName) {
	expect(mockInvoke).toBeCalledWith({
		FunctionName: `arn:aws:lambda:us-east-1:374852340823:function:${functionName}`,
		InvocationType: "RequestResponse",
		Payload: "{}"
	});
}

function thenLambdaIsInvokedWith(functionName, props) {
	const defaultProps = {
		FunctionName: functionName,
		InvocationType: undefined,
		Payload: undefined,
		ClientContext: undefined,
		Qualifier: undefined
	};

	expect(mockInvoke).toBeCalledWith(_.merge(defaultProps, props));
}

function thenResponseUrlIsCalled() {
	expect(mockRequest).toBeCalledWith(
		expect.objectContaining({
			hostname: "theburningmonk.com",
			port: null,
			path: "/",
			method: "PUT",
			headers: {
				"Content-Type": "",
				"Content-Length": expect.any(Number)
			}
		}),
		expect.any(Function)
	);
}
