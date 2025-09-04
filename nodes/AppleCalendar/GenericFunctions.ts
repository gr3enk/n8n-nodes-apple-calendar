import moment from 'moment-timezone';
import { DateTime } from 'luxon';

import {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
	IPollFunctions,
} from 'n8n-workflow';
import { XMLParser } from 'fast-xml-parser';
import { parseICS } from './Ical';

export async function getEvents(
	this: ILoadOptionsFunctions | IExecuteFunctions | IPollFunctions,
	calendarId: string,
	timeMin: string,
	timeMax: string,
): Promise<ICalendarEvent[]> {
	const principal = await getPrincipal.call(this);

	const options = {
		method: 'REPORT',
		url: `https://caldav.icloud.com/${principal}/calendars/${calendarId}/`,
		headers: {
			Depth: '1',
			'Content-Type': 'application/xml; charset=utf-8',
		},
		body: `<?xml version="1.0" encoding="utf-8"?>
                <c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
                <d:prop>
                    <d:getetag/>
                    <c:calendar-data/>
                </d:prop>
                <c:filter>
                    <c:comp-filter name="VCALENDAR">
                    <c:comp-filter name="VEVENT">
                        <c:time-range start="${timeMin}" end="${timeMax}"/>
                    </c:comp-filter>
                    </c:comp-filter>
                </c:filter>
                </c:calendar-query>`,
		bodyContentType: 'text',
	};

	const response = await this.helpers.httpRequestWithAuthentication.call(
		this,
		'appleCalendarApi',
		options,
	);

	return parseCalDavResponse.call(this, response);
}

export async function getCalendarsAsList(
	this: ILoadOptionsFunctions | IExecuteFunctions | IPollFunctions,
) {
	const principal = await getPrincipal.call(this);

	const calendars = await getCalendars.call(this, principal);

	return {
		results: calendars.map((c: Calendar) => ({
			name: c.displayName,
			value: c.id,
		})),
	};
}

export async function getCalendars(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	principal: string,
): Promise<Calendar[]> {
	const options = {
		method: 'PROPFIND',
		url: `https://caldav.icloud.com/${principal}/calendars/`,
		headers: {
			Depth: '1',
			'Content-Type': 'application/xml; charset=utf-8',
		},
		body: `<?xml version="1.0" encoding="UTF-8"?>
                <d:propfind xmlns:d="DAV:" xmlns:cal="urn:ietf:params:xml:ns:caldav">
                <d:prop>
                    <d:displayname/>
                    <cal:calendar-description/>
                    <cal:supported-calendar-component-set/>
                </d:prop>
                </d:propfind>`,
		bodyContentType: 'text',
	};

	const response = await this.helpers.httpRequestWithAuthentication.call(
		this,
		'appleCalendarApi',
		options,
	);

	const calendars = parseCalendars(response, principal);

	return calendars;
}

export async function getPrincipal(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
): Promise<string> {
	const options = {
		method: 'PROPFIND',
		url: 'https://caldav.icloud.com/',
		headers: {
			Depth: '0',
			'Content-Type': 'application/xml; charset=utf-8',
		},
		body: `<?xml version="1.0" encoding="UTF-8"?>
		<d:propfind xmlns:d="DAV:">
		  <d:prop>
		    <d:current-user-principal/>
		  </d:prop>
		</d:propfind>`,
		bodyContentType: 'text',
	};

	const response = await this.helpers.httpRequestWithAuthentication.call(
		this,
		'appleCalendarApi',
		options,
	);

	const principalHref = findXmlValues(response, [
		'multistatus',
		'response',
		'propstat',
		'prop',
		'current-user-principal',
		'href',
	]).find((href) => href.includes('/principal'));

	if (!principalHref) throw new Error('Principal href not found');

	const principal = principalHref.split('/').find((s) => !isNaN(Number(s)) && s.length == 10);
	if (!principal) throw new Error('Principal not found');

	return principal;
}

export function findXmlValues(xml: string, path: string[]): string[] {
	const parser = new XMLParser({
		ignoreAttributes: true,
		ignoreDeclaration: true,
		attributeNamePrefix: '',
	});
	const jsonObj = parser.parse(xml);

	let nodes: any[] = [jsonObj];

	for (const key of path) {
		const nextNodes: any[] = [];
		for (const node of nodes) {
			if (node && node[key]) {
				if (Array.isArray(node[key])) {
					nextNodes.push(...node[key]);
				} else {
					nextNodes.push(node[key]);
				}
			}
		}
		nodes = nextNodes;
		if (nodes.length === 0) break;
	}

	return nodes.map((n) => (typeof n === 'string' ? n : JSON.stringify(n)));
}

interface Calendar {
	displayName: string;
	href: string;
	id: string;
}

export function parseCalendars(xml: string, principal: string): Calendar[] {
	const parser = new XMLParser({
		ignoreAttributes: true,
		ignoreDeclaration: true,
		attributeNamePrefix: '',
	});
	const jsonObj = parser.parse(xml);

	const responses = jsonObj.multistatus?.response;
	if (!responses) return [];

	const responseArray = Array.isArray(responses) ? responses : [responses];

	const calendars: Calendar[] = responseArray.map((resp: any) => {
		const href = resp.href || '';
		const propstats = Array.isArray(resp.propstat) ? resp.propstat : [resp.propstat];
		let displayName = '';
		for (const propstat of propstats) {
			if (propstat.prop?.displayname) {
				displayName = propstat.prop.displayname;
				break;
			}
		}

		const id = href
			.split('/')
			.find((s: string) => s != principal && s.length > 0 && s != 'calendars');
		return { displayName, href, id };
	});

	return calendars.filter((c) => c.id !== undefined && c.displayName.length > 0);
}

export async function getTimezones(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const results: INodeListSearchItems[] = moment.tz
		.names()
		.map((timezone) => ({
			name: timezone,
			value: timezone,
		}))
		.filter(
			(c) =>
				!filter ||
				c.name.toLowerCase().includes(filter.toLowerCase()) ||
				c.value?.toString() === filter,
		);
	return { results };
}

export type ICalendarEvent = Record<string, string | any>;

export function parseCalDavResponse(this: IExecuteFunctions, xmlString: string): ICalendarEvent[] {
	const parser = new XMLParser({
		ignoreAttributes: false,
		textNodeName: '#text',
	});
	const parsed = parser.parse(xmlString);

	const responses = parsed?.multistatus?.response;
	if (!responses) return [];

	const responseArray = Array.isArray(responses) ? responses : [responses];

	const events: Array<Record<string, any>> = [];

	for (const res of responseArray) {
		const calendarData = res?.propstat?.prop?.['calendar-data'];
		if (!calendarData) continue;

		const icsText = typeof calendarData === 'string' ? calendarData : calendarData['#text'];

		const parsed = parseICS(icsText);
		for (let k in parsed) {
			if (parsed.hasOwnProperty(k)) {
				var ev = parsed[k];
				if (parsed[k].type == 'VEVENT') {
					events.push(parsed[k]);
				}
			}
		}
	}

	return events;
}

export const TIMEZONE_VALIDATION_REGEX = `(${moment.tz
	.names()
	.map((t) => t.replace('+', '\\+'))
	.join('|')})[ \t]*`;

export function dateObjectToISO<T>(date: T): string {
	if (date instanceof DateTime) return date.toISO()!;
	if (date instanceof Date) return date.toISOString();
	return date as string;
}

export function isoToCalDavFormat(isoString: string): string {
	return moment(isoString).utc().format('YYYYMMDDTHHmmss[Z]');
}
