import { INodeProperties } from 'n8n-workflow';
import { TIMEZONE_VALIDATION_REGEX } from './GenericFunctions';

export const calendarOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['calendar'],
			},
		},
		options: [
			{
				name: 'Get Events',
				value: 'getEvents',
				description: 'If a time-slot is available in a calendar',
				action: 'Get events in a calendar',
			},
		],
		default: 'getEvents',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['account'],
			},
		},
		options: [
			{
				name: 'Get Principal',
				value: 'getPrincipal',
				description: 'Get the user principal of the Apple Calendar',
				action: 'Get user principal of the apple calendar',
			},
			{
				name: 'Get Calendars',
				value: 'getCalendars',
				description: 'Get the calendars of the Apple Calendar',
				action: 'Get calendars of the apple calendar',
			},
		],
		default: 'getCalendars',
	},
];

export const calendarFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 calendar:getEvents                      */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Calendar',
		name: 'calendar',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'Apple Calendar to operate on',
		modes: [
			{
				displayName: 'Calendar',
				name: 'list',
				type: 'list',
				placeholder: 'Select a Calendar...',
				typeOptions: {
					searchListMethod: 'getCalendarsAsList',
					searchable: true,
				},
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							// calendar ids are emails. W3C email regex with optional trailing whitespace.
							regex:
								'(^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\\.[a-zA-Z0-9-]+)*(?:[ \t]+)*$)',
							errorMessage: 'Not a valid Apple Calendar Name',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: '(^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\\.[a-zA-Z0-9-]+)*)',
				},
				placeholder: 'Calendar',
			},
		],
		displayOptions: {
			show: {
				resource: ['calendar'],
			},
		},
	},
	{
		displayName: 'Start Time',
		name: 'timeMin',
		type: 'dateTime',
		required: true,
		displayOptions: {
			show: {
				operation: ['getEvents'],
				resource: ['calendar'],
				'@version': [{ _cnd: { gte: 1 } }],
			},
		},
		default: '={{ $now }}',
		description:
			'Start of the interval, use <a href="https://docs.n8n.io/code/cookbook/luxon/" target="_blank">expression</a> to set a date, or switch to fixed mode to choose date from widget',
	},
	{
		displayName: 'End Time',
		name: 'timeMax',
		type: 'dateTime',
		required: true,
		displayOptions: {
			show: {
				operation: ['getEvents'],
				resource: ['calendar'],
				'@version': [{ _cnd: { gte: 1 } }],
			},
		},
		default: "={{ $now.plus(1, 'hour') }}",
		description:
			'End of the interval, use <a href="https://docs.n8n.io/code/cookbook/luxon/" target="_blank">expression</a> to set a date, or switch to fixed mode to choose date from widget',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		displayOptions: {
			show: {
				operation: ['getEvents'],
				resource: ['calendar'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Output Format',
				name: 'outputFormat',
				type: 'options',
				options: [
					{
						name: 'Basic Data',
						value: 'basic',
						description: 'Returns the basic data of the events',
					},
					{
						name: 'Raw Data',
						value: 'raw',
						description: 'Returns the raw data of the events',
					},
				],
				default: 'basic',
				description: 'The format to return the data in',
			},
			{
				displayName: 'Timezone',
				name: 'timezone',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				description: 'Time zone used in the response. By default n8n timezone is used.',
				modes: [
					{
						displayName: 'Timezone',
						name: 'list',
						type: 'list',
						placeholder: 'Select a Timezone...',
						typeOptions: {
							searchListMethod: 'getTimezones',
							searchable: true,
						},
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: TIMEZONE_VALIDATION_REGEX,
									errorMessage: 'Not a valid Timezone',
								},
							},
						],
						extractValue: {
							type: 'regex',
							regex: '([-+/_a-zA-Z0-9]*)',
						},
						placeholder: 'Europe/Berlin',
					},
				],
			},
		],
	},
];
