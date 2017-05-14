# MM-GoogleCalendar

## Dependencies (Add following packages to package.json)

Upgrade to the latest npm and get the latest magicmirror

Add the following dependencies to package.json in the MagicMirror directory (https://github.com/MichMich/MagicMirror)

"google-auth-library": "^0.10.0"

"googleapis": "^19.0.0"

"moment-timezone": "^0.5.13"

run `npm install`

## Module Installation

- Clone this repo
- Rename the folder from "MM-GoogleCalendar" to gcalendar
- put the folder in MagicMirror modules directory

## Turn on Google Calendar API and get client id and key

- Use this [wizard](https://console.developers.google.com/flows/enableapi?apiid=calendar) to create or select a project in the Google Developers Console and automatically turn on the API. Click Continue, then Go to credentials.
- On the Add credentials to your project page, click the Cancel button.
- At the top of the page, select the OAuth consent screen tab. Select an Email address, enter a Product name if not already set, and click the Save button.
- Select the Credentials tab, click the Create credentials button and select OAuth client ID.
- Select the application type Other, enter the name "Google Calendar API Quickstart", and click the Create button.
- Click OK to dismiss the resulting dialog.
- Click the file_download (Download JSON) button to the right of the client ID.
- Move this file to MagicMirror home directory and rename it client_secret.json.

## Running for the first time

- Enable gcalendar in config.js in Magic Mirror
- run the magic mirror using 'npm start'
- The first time you run this with gcalendar enabled, it will prompt you to authorize access.
- On the command line, you will be provided with a link. Follow the link in your browser (login, etc). You will be provided with a code.
- Paste the code on command line
- After the first run, you will not be prompted again

## Screenshots
![ScreenShot](https://raw.github.com/hemanthsagarb/MM-GoogleCalendar/master/look.png)





