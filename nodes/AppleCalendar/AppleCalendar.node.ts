import {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { nodeConnectionTypes, NodeApiError, NodeOperationError } from 'n8n-workflow';
import { calendarFields, calendarOperations } from './CalendarDescription';
import {
	dateObjectToISO,
	getCalendarsAsList,
	getEvents,
	getTimezones,
	ICalendarEvent,
	isoToCalDavFormat,
} from './GenericFunctions';

type NodeConnectionType = (typeof nodeConnectionTypes)[number];

export class AppleCalendar implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Apple Calendar',
		name: 'appleCalendar',
		icon: 'file:appleCalendar.svg',
		group: ['input'],
		version: [1],
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Apple Calendar API',
		defaults: {
			name: 'Apple Calendar',
		},

		inputs: ['main'] as NodeConnectionType[],
		outputs: ['main'] as NodeConnectionType[],
		usableAsTool: true,
		credentials: [
			{
				name: 'appleCalendarApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Calendar',
						value: 'calendar',
					},
					// {
					// 	name: 'Account',
					// 	value: 'account',
					// },
				],
				default: 'calendar',
			},
			...calendarOperations,
			...calendarFields,
			{
				displayName:
					'This node will use the time zone set in n8n’s settings, but you can override this in the workflow settings',
				name: 'useN8nTimeZone',
				type: 'notice',
				default: '',
			},
		],
	};

	methods = {
		listSearch: {
			getCalendarsAsList,
			getTimezones,
		},
	};
	// The execute method will go here
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		const defaultTimezone = this.getTimezone();
		const nodeVersion = this.getNode().typeVersion;
		const length = items.length;
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'calendar' && operation === 'getEvents') {
					const calendarId = decodeURIComponent(
						this.getNodeParameter('calendar', i, '', { extractValue: true }) as string,
					);
					const timeMin = dateObjectToISO(this.getNodeParameter('timeMin', i));
					const timeMax = dateObjectToISO(this.getNodeParameter('timeMax', i));
					const options = this.getNodeParameter('options', i);
					const outputFormat = (options.outputFormat as string) || 'basic';

					const basicKeys = [
						'uid',
						'summary',
						'description',
						'start',
						'end',
						'location',
						'created',
						'lastmodified',
					];

					const events: ICalendarEvent[] = await getEvents.call(
						this,
						calendarId,
						isoToCalDavFormat(timeMin),
						isoToCalDavFormat(timeMax),
					);

					if (outputFormat === 'basic') {
						returnData.push(
							...events.map((e) => {
								return {
									json: Object.fromEntries(
										Object.entries(e).filter(([key]) => basicKeys.includes(key)),
									),
								};
							}),
						);
					} else {
						returnData.push(
							...events.map((e) => {
								return { json: e };
							}),
						);
					}
				}
			} catch (error) {
				if (!this.continueOnFail()) {
					throw error;
				} else {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
			}
		}

		return [returnData];
	}
}
