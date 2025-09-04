import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AppleCalendarApi implements ICredentialType {
	name = 'appleCalendarApi';
	displayName = 'Apple Calendar API';
	documentationUrl = 'https://support.apple.com/en-us/102654';
	properties: INodeProperties[] = [
		{
			displayName: 'iCloud Email Address',
			name: 'username',
			type: 'string',
			default: '',
			placeholder: 'yourmail@icloud.com',
		},
		{
			displayName: 'App-Specific Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			placeholder: 'xxxx-xxxx-xxxx-xxxx',
		},
	];

	// Basic Auth Setup
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			auth: {
				username: '={{$credentials.username}}',
				password: '={{$credentials.password}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			//@ts-ignore
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
		},
	};
}
