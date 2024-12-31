const Client = require('owfs').Client;
const config = require('./config.json');

const deviceStates = Object.fromEntries(
  config.devices.map((device) => [device.address, undefined])
);

const con = new Client(config.owserver.host, config.owserver.port ?? 4304);

async function notifyWebhook(webhook, value) {
  console.debug(`Sending to webhook ${webhook.url}`);
  const response = await fetch(webhook.url, {
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ value }),
    method: 'PUT',
  });

  if (!response.ok) {
    throw new Error(`Response status: ${response.status}`);
  }

  console.debug(`Received status ${response.status} from webhook ${webhook.url}`);
}

function checkDevices() {
  for (const { address, webhook } of config.devices) {
    con.presence(`/${address}`, async (err, value) => {
      if (err) {
        console.error(err);
      }

      const previousValue = deviceStates[address];
      if (previousValue !== undefined && previousValue !== value) {
        console.debug(`Device ${address} has changed from ${previousValue} to ${value}`);

        if (webhook) {
          try {
            await notifyWebhook(webhook, value);
          } catch (e) {
            console.error(e);
          }
        }
      }

      deviceStates[address] = value;
    });
  }

  setTimeout(checkDevices, config.poll);
}

checkDevices();
